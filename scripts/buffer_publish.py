#!/usr/bin/env python3
"""Prepared Parent Buffer publishing guard and API client.

Dry-run is the default. Nothing is published unless --publish is explicitly supplied.
"""
import argparse, json, os, sys, urllib.request, urllib.error
from pathlib import Path

QUEUE = Path("data/publishing-queue.json")
STATE = Path("data/buffer-state.json")
LEGAL_OK = "VERIFIED — ALABAMA AUTHORITY COMPLETE"

def load(path):
    return json.loads(path.read_text())

def eligible(record):
    reasons=[]
    if record.get("publishGate") != "READY": reasons.append("publishGate is not READY")
    if not record.get("sourceUrl"): reasons.append("sourceUrl missing")
    if record.get("contentType") == "alabama-legal" and record.get("verificationStatus") != LEGAL_OK:
        reasons.append("Alabama authority verification incomplete")
    if record.get("assetStatus") not in ("READY","NOT_REQUIRED"):
        reasons.append("asset not ready")
    if record.get("copyStatus") != "READY": reasons.append("copy not ready")
    if not record.get("copy"): reasons.append("copy missing")
    return reasons

def request_json(url, token, method="GET", payload=None):
    # Reject malformed secret values before urllib tries to encode HTTP headers.
    # This reports only safe metadata, never the credential itself.
    try:
        token.encode("latin-1")
    except UnicodeEncodeError:
        raise ValueError("BUFFER_ACCESS_TOKEN contains non-HTTP-header characters")
    headers={"Authorization": f"Bearer {token}", "Accept":"application/json", "Content-Type":"application/json"}
    data=None if payload is None else json.dumps(payload).encode()
    req=urllib.request.Request(url, data=data, headers=headers, method=method)
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.loads(resp.read().decode() or "{}")

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument("--discover", action="store_true", help="Validate token and discover accessible Buffer data")
    ap.add_argument("--publish", action="store_true", help="Enable publishing after controlled-test approval")
    args=ap.parse_args()
    token=os.getenv("BUFFER_ACCESS_TOKEN")
    if token:
        token=token.strip().strip("\\\"").strip("\\'")
    if not token:
        print("BUFFER_ACCESS_TOKEN is unavailable", file=sys.stderr); return 2

    queue=load(QUEUE)
    ready=[]; blocked=[]
    for r in queue.get("records",[]):
        why=eligible(r)
        (blocked if why else ready).append({"id":r.get("id"),"reasons":why} if why else r)

    print(f"Queue guard: {len(ready)} eligible; {len(blocked)} blocked.")
    for b in blocked: print("BLOCKED", b["id"], "; ".join(b["reasons"]))

    if args.discover:
        # Buffer's current API surface may evolve; endpoint is configurable without code changes.
        base=os.getenv("BUFFER_API_BASE","https://api.buffer.com")
        endpoint=os.getenv("BUFFER_DISCOVERY_PATH","/1/profiles.json")
        try:
            result=request_json(base.rstrip("/") + endpoint, token)
            # Never print tokens. Discovery metadata is safe for workflow logs.
            items=result if isinstance(result,list) else result.get("data",result)
            print("BUFFER_AUTH_OK")
            print(json.dumps(items, indent=2)[:12000])
        except urllib.error.HTTPError as e:
            print(f"BUFFER_API_HTTP_{e.code}", file=sys.stderr)
            return 3
        except Exception as e:
            safe=str(e).replace(token, "[REDACTED]") if token else str(e)
            print("BUFFER_API_ERROR", type(e).__name__, safe[:500], file=sys.stderr)
            return 4

    if args.publish:
        if not ready:
            print("No READY records; nothing published.")
            return 0
        print("Publishing remains intentionally disabled until channel discovery and controlled-test approval are complete.", file=sys.stderr)
        return 5
    return 0

if __name__=="__main__":
    raise SystemExit(main())
