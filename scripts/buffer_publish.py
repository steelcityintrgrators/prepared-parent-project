#!/usr/bin/env python3
"""Prepared Parent Buffer publishing guard and production API client.

Publishing is fail-closed:
- only queue records with publishGate=READY are eligible;
- Alabama legal content must carry the exact authority-complete verification state;
- a source URL, approved copy, and ready asset are mandatory;
- one optional content ID can be selected to prevent broad accidental publishing.
"""
import argparse
import datetime as dt
import json
import os
import sys
import urllib.error
import urllib.request
from pathlib import Path

QUEUE = Path("data/publishing-queue.json")
LEGAL_OK = "VERIFIED — ALABAMA AUTHORITY COMPLETE"


def load(path):
    return json.loads(path.read_text())


def write_output(path, payload):
    if not path:
        return
    p = Path(path)
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(json.dumps(payload, indent=2) + "\n")


def eligible(record):
    reasons = []
    if record.get("publishGate") != "READY":
        reasons.append("publishGate is not READY")
    if not record.get("sourceUrl"):
        reasons.append("sourceUrl missing")
    if record.get("contentType") == "alabama-legal" and record.get("verificationStatus") != LEGAL_OK:
        reasons.append("Alabama authority verification incomplete")
    if record.get("assetStatus") not in ("READY", "NOT_REQUIRED"):
        reasons.append("asset not ready")
    if record.get("copyStatus") != "READY":
        reasons.append("copy not ready")
    if not record.get("copy"):
        reasons.append("copy missing")
    return reasons


def clean_key(value):
    if not value:
        return None
    value = value.strip().strip('"').strip("'")
    if any(ord(ch) > 127 for ch in value):
        raise ValueError("Buffer API key secret contains non-ASCII characters")
    return value


def graphql(key, query, variables=None):
    headers = {
        "Authorization": f"Bearer {key}",
        "Accept": "application/json",
        "Content-Type": "application/json",
    }
    data = json.dumps({"query": query, "variables": variables or {}}).encode("utf-8")
    req = urllib.request.Request("https://api.buffer.com", data=data, headers=headers, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            payload = json.loads(resp.read().decode("utf-8") or "{}")
    except urllib.error.HTTPError as exc:
        body = exc.read().decode("utf-8", "replace")[:1000]
        raise RuntimeError(f"Buffer HTTP {exc.code}: {body}") from exc
    if payload.get("errors"):
        raise RuntimeError("Buffer GraphQL: " + str(payload["errors"][0].get("message", "unknown error")))
    return payload.get("data") or {}


ACCOUNT_QUERY = """query GetAccount {
  account {
    id email name
    organizations { id name }
  }
}"""

CHANNELS_QUERY = """query GetChannels($input: ChannelsInput!) {
  channels(input: $input) {
    id name displayName service organizationId isDisconnected isLocked
  }
}"""


def discover_channels(key):
    account = graphql(key, ACCOUNT_QUERY).get("account") or {}
    channels = []
    for org in account.get("organizations") or []:
        oid = org.get("id")
        if not oid:
            continue
        channels.extend(
            graphql(key, CHANNELS_QUERY, {"input": {"organizationId": oid}}).get("channels") or []
        )
    return account, channels


def publication_metadata(service, asset_kind, youtube_title):
    if service == "facebook":
        return "{facebook: {type: post}}"
    if service == "instagram":
        post_type = "reel" if asset_kind == "video" else "post"
        return "{instagram: {type: " + post_type + ", shouldShareToFeed: true}}"
    if service == "youtube":
        safe_title = youtube_title.replace("\\", "\\\\").replace('"', '\\"')
        return (
            '{youtube: {title: "'
            + safe_title
            + '", categoryId: "26", privacy: public, madeForKids: false, notifySubscribers: true}}'
        )
    raise ValueError(f"Unsupported service: {service}")


def create_post(key, channel, *, text, asset_url, asset_kind, youtube_title):
    service = channel["service"]
    if service == "youtube" and asset_kind != "video":
        return {
            "service": service,
            "channel": channel.get("displayName") or channel.get("name"),
            "skipped": True,
            "reason": "YouTube publishing requires video in this gateway",
        }
    asset_field = "video" if asset_kind == "video" else "image"
    meta = publication_metadata(service, asset_kind, youtube_title)
    mutation = f"""mutation CreatePost($text: String!, $asset: String!) {{
      createPost(input: {{text:$text, channelId:"{channel['id']}", schedulingType:automatic, mode:shareNow,
        assets:[{{{asset_field}:{{url:$asset}}}}], metadata:{meta}}}) {{
        ... on PostActionSuccess {{ post {{ id status externalLink }} }}
        ... on MutationError {{ message }}
      }}
    }}"""
    result = graphql(key, mutation, {"text": text, "asset": asset_url}).get("createPost") or {}
    return {
        "service": service,
        "channel": channel.get("displayName") or channel.get("name"),
        "channelId": channel.get("id"),
        "result": result,
    }


def post_succeeded(item):
    if item.get("skipped"):
        return True
    result = item.get("result") or {}
    return bool((result.get("post") or {}).get("id")) and not result.get("message")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--discover", action="store_true")
    parser.add_argument("--queue-only", action="store_true")
    parser.add_argument("--publish", action="store_true")
    parser.add_argument("--test-social", action="store_true")
    parser.add_argument("--verify-posts", nargs="*")
    parser.add_argument("--publish-asset")
    parser.add_argument("--asset-kind", choices=["image", "video"])
    parser.add_argument("--text")
    parser.add_argument("--targets", default="facebook,instagram")
    parser.add_argument("--content-id")
    parser.add_argument("--output")
    args = parser.parse_args()

    queue = load(QUEUE)
    ready = []
    blocked = []
    for record in queue.get("records", []):
        if args.content_id and record.get("id") != args.content_id:
            continue
        why = eligible(record)
        if why:
            blocked.append({"id": record.get("id"), "reasons": why})
        else:
            ready.append(record)

    print(f"Queue guard: {len(ready)} eligible; {len(blocked)} blocked.")
    for item in blocked:
        print("BLOCKED", item["id"], "; ".join(item["reasons"]))
    if args.queue_only:
        if args.content_id and not ready:
            return 4
        return 0

    raw = os.getenv("BUFFER_API_KEY")
    if not raw:
        print("BUFFER_API_KEY unavailable", file=sys.stderr)
        return 2
    try:
        key = clean_key(raw)
    except ValueError as exc:
        print("BUFFER_CREDENTIAL_INVALID", str(exc), file=sys.stderr)
        return 2

    if args.discover:
        try:
            account, channels = discover_channels(key)
            print("BUFFER_AUTH_OK GraphQL")
            safe_account = {k: account.get(k) for k in ("id", "name")}
            safe_account["organizations"] = account.get("organizations") or []
            print("ACCOUNT", json.dumps(safe_account))
            print("CHANNELS", json.dumps(channels, indent=2)[:12000])
            payload = {
                "accountId": account.get("id"),
                "organizations": account.get("organizations") or [],
                "channels": channels,
            }
            Path("data/buffer-state.json").write_text(json.dumps(payload, indent=2) + "\n")
            write_output(args.output, payload)
            return 0
        except Exception as exc:
            print("BUFFER_DISCOVERY_FAILED", str(exc), file=sys.stderr)
            return 3

    if args.verify_posts is not None:
        query = """query FindPost($id: PostId!) {
          post(input: {id: $id}) { id status externalLink error { message } }
        }"""
        results = []
        for post_id in args.verify_posts:
            try:
                post = graphql(key, query, {"id": post_id}).get("post")
                results.append(post or {"id": post_id, "lookupError": "post not returned"})
            except Exception as exc:
                results.append({"id": post_id, "lookupError": str(exc)})
        write_output(args.output, results)
        print("POST_VERIFICATION", json.dumps(results, indent=2))
        return 0

    if args.publish_asset:
        if not args.asset_kind or not args.text:
            raise SystemExit("--asset-kind and --text required")
        _, channels = discover_channels(key)
        wanted = {x.strip() for x in args.targets.split(",") if x.strip()}
        results = []
        for channel in [c for c in channels if c.get("service") in wanted]:
            results.append(
                create_post(
                    key,
                    channel,
                    text=args.text,
                    asset_url=args.publish_asset,
                    asset_kind=args.asset_kind,
                    youtube_title="Prepared Parent #Shorts",
                )
            )
        payload = {"publishedAt": dt.datetime.now(dt.timezone.utc).isoformat(), "posts": results}
        write_output(args.output, payload)
        print("ASSET_PUBLISH_RESULTS", json.dumps(payload, indent=2))
        return 0 if all(post_succeeded(x) for x in results) else 6

    if args.publish:
        if not ready:
            message = "No READY records selected; nothing published."
            print(message, file=sys.stderr if args.content_id else sys.stdout)
            return 4 if args.content_id else 0
        _, channels = discover_channels(key)
        results = []
        for record in ready:
            asset_url = record.get("assetUrl")
            asset_kind = record.get("assetKind")
            if not asset_url or asset_kind not in ("image", "video"):
                print(f"{record.get('id')}: READY record missing assetUrl/assetKind", file=sys.stderr)
                return 5
            wanted = set(record.get("targets") or [])
            matched = [c for c in channels if c.get("service") in wanted and not c.get("isDisconnected")]
            present = {c.get("service") for c in matched}
            missing = wanted - present
            if missing:
                print(f"{record.get('id')}: missing connected channels {sorted(missing)}", file=sys.stderr)
                return 5
            post_results = []
            for channel in matched:
                post_results.append(
                    create_post(
                        key,
                        channel,
                        text=record["copy"],
                        asset_url=asset_url,
                        asset_kind=asset_kind,
                        youtube_title=record.get("youtubeTitle") or record.get("topic") or "Prepared Parent #Shorts",
                    )
                )
            results.append(
                {
                    "contentId": record.get("id"),
                    "sourceUrl": record.get("sourceUrl"),
                    "assetUrl": asset_url,
                    "assetKind": asset_kind,
                    "posts": post_results,
                }
            )
        payload = {
            "publishedAt": dt.datetime.now(dt.timezone.utc).isoformat(),
            "records": results,
        }
        write_output(args.output, payload)
        print("PUBLISH_RESULTS", json.dumps(payload, indent=2))
        ok = all(post_succeeded(post) for rec in results for post in rec["posts"])
        return 0 if ok else 6

    if args.test_social:
        # Legacy controlled proof path retained for backwards compatibility.
        _, channels = discover_channels(key)
        targets = [c for c in channels if c.get("service") in ("facebook", "instagram", "youtube")]
        media_url = "https://steelcityintrgrators.github.io/prepared-parent-project/media/PP-008-SHORT.mp4"
        proof_text = (
            "Could your family find the important information they need during an emergency? "
            "Keep key contacts, medications and allergies, school or child-care information, and meeting places organized. "
            "Planning resource: https://www.ready.gov/plan "
            "#PreparedParent #FamilyPreparedness #AlabamaFamilies"
        )
        results = [
            create_post(
                key,
                channel,
                text=proof_text,
                asset_url=media_url,
                asset_kind="video",
                youtube_title="Family Emergency Information Sheet #Shorts",
            )
            for channel in targets
        ]
        payload = {"publishedAt": dt.datetime.now(dt.timezone.utc).isoformat(), "posts": results}
        write_output(args.output, payload)
        print("SOCIAL_PROOF_RESULTS", json.dumps(payload, indent=2))
        return 0 if all(post_succeeded(x) for x in results) else 6

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
