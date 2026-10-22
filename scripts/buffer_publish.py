#!/usr/bin/env python3
"""Prepared Parent Buffer publishing guard and current API-key client."""
import argparse, json, os, sys, urllib.request, urllib.error
from pathlib import Path

QUEUE=Path("data/publishing-queue.json")
LEGAL_OK="VERIFIED — ALABAMA AUTHORITY COMPLETE"

def load(path): return json.loads(path.read_text())

def eligible(record):
    reasons=[]
    if record.get("publishGate")!="READY": reasons.append("publishGate is not READY")
    if not record.get("sourceUrl"): reasons.append("sourceUrl missing")
    if record.get("contentType")=="alabama-legal" and record.get("verificationStatus")!=LEGAL_OK:
        reasons.append("Alabama authority verification incomplete")
    if record.get("assetStatus") not in ("READY","NOT_REQUIRED"): reasons.append("asset not ready")
    if record.get("copyStatus")!="READY": reasons.append("copy not ready")
    if not record.get("copy"): reasons.append("copy missing")
    return reasons

def clean_key(value):
    if not value: return None
    value=value.strip().strip('"').strip("'")
    if any(ord(ch)>127 for ch in value):
        raise ValueError("Buffer API key secret contains non-ASCII characters")
    return value

def graphql(key, query, variables=None):
    headers={"Authorization":f"Bearer {key}","Accept":"application/json","Content-Type":"application/json"}
    data=json.dumps({"query":query,"variables":variables or {}}).encode("utf-8")
    req=urllib.request.Request("https://api.buffer.com",data=data,headers=headers,method="POST")
    try:
        with urllib.request.urlopen(req,timeout=30) as resp:
            payload=json.loads(resp.read().decode("utf-8") or "{}")
    except urllib.error.HTTPError as e:
        body=e.read().decode("utf-8","replace")[:1000]
        raise RuntimeError(f"Buffer HTTP {e.code}: {body}")
    if payload.get("errors"):
        raise RuntimeError("Buffer GraphQL: "+str(payload["errors"][0].get("message","unknown error")))
    return payload.get("data") or {}

ACCOUNT_QUERY="""query GetAccount {
  account {
    id email name
    organizations { id name }
  }
}"""

CHANNELS_QUERY="""query GetChannels($input: ChannelsInput!) {
  channels(input: $input) {
    id name displayName service organizationId isDisconnected isLocked
  }
}"""

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument("--discover",action="store_true")
    ap.add_argument("--queue-only",action="store_true")
    ap.add_argument("--publish",action="store_true")
    ap.add_argument("--test-social",action="store_true")
    args=ap.parse_args()
    queue=load(QUEUE); ready=[]; blocked=[]
    for r in queue.get("records",[]):
        why=eligible(r)
        (blocked if why else ready).append({"id":r.get("id"),"reasons":why} if why else r)
    print(f"Queue guard: {len(ready)} eligible; {len(blocked)} blocked.")
    for b in blocked: print("BLOCKED",b["id"],"; ".join(b["reasons"]))
    if args.queue_only: return 0

    raw=os.getenv("BUFFER_API_KEY")
    if not raw:
        print("BUFFER_API_KEY unavailable",file=sys.stderr); return 2
    try: key=clean_key(raw)
    except ValueError as e:
        print("BUFFER_CREDENTIAL_INVALID",str(e),file=sys.stderr); return 2

    if args.discover:
        try:
            account=graphql(key,ACCOUNT_QUERY).get("account") or {}
            print("BUFFER_AUTH_OK GraphQL")
            safe_account={k:account.get(k) for k in ("id","name")}
            safe_account["organizations"]=account.get("organizations") or []
            print("ACCOUNT",json.dumps(safe_account))
            organizations=account.get("organizations") or []
            discovered=[]
            for org in organizations:
                oid=org.get("id")
                if not oid: continue
                channels=graphql(key,CHANNELS_QUERY,{"input":{"organizationId":oid}}).get("channels") or []
                discovered.extend(channels)
            print("CHANNELS",json.dumps(discovered,indent=2)[:12000])
            Path("data/buffer-state.json").write_text(json.dumps({"accountId":account.get("id"),"organizations":organizations,"channels":discovered},indent=2)+"\\n")
            return 0
        except Exception as e:
            print("BUFFER_DISCOVERY_FAILED",str(e),file=sys.stderr); return 3

    if args.test_social:
        account=graphql(key,ACCOUNT_QUERY).get("account") or {}
        orgs=account.get("organizations") or []
        channels=[]
        for org in orgs:
            channels += graphql(key,CHANNELS_QUERY,{"input":{"organizationId":org["id"]}}).get("channels") or []
        targets=[ch for ch in channels if ch.get("service") in ("facebook","instagram","youtube")]
        media_url="https://steelcityintrgrators.github.io/prepared-parent-project/media/PP-008-SHORT.mp4"
        proof_text=("Could your family find the important information they need during an emergency? "
                    "Keep key contacts, medications and allergies, school or child-care information, and meeting places organized. "
                    "Planning resource: https://www.ready.gov/plan #PreparedParent #FamilyPreparedness #AlabamaFamilies")
        results=[]
        for ch in targets:
            cid=ch["id"]; svc=ch.get("service")
            if svc=="facebook":
                meta="{facebook: {type: reel}}"
            elif svc=="instagram":
                meta="{instagram: {type: reel, shouldShareToFeed: true}}"
            else:
                meta='{youtube: {title: "Family Emergency Information Sheet #Shorts", categoryId: "26", privacy: public, madeForKids: false, notifySubscribers: true}}'
            mutation=f'''mutation CreatePost($text: String!, $video: String!) {{
              createPost(input: {{text: $text, channelId: "{cid}", schedulingType: automatic, mode: shareNow,
                assets: {{videos: [{{url: $video}}]}}, metadata: {meta}}}) {{
                ... on PostActionSuccess {{ post {{ id status externalLink }} }}
                ... on MutationError {{ message }}
              }}
            }}'''
            out=graphql(key,mutation,{"text":proof_text,"video":media_url}).get("createPost") or {}
            results.append({"service":svc,"channel":ch.get("displayName") or ch.get("name"),"result":out})
        print("SOCIAL_PROOF_RESULTS",json.dumps(results,indent=2))
        return 0
    if args.publish:
        if not ready:
            print("No READY records; nothing published."); return 0
        print("Publish path remains gated to READY queue records.",file=sys.stderr); return 5
    return 0

if __name__=="__main__": raise SystemExit(main())
