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

def request_json(url,key,method="GET",payload=None):
    # Buffer's current API-key product uses an API key, not the legacy /1 access-token API.
    headers={"x-api-key":key,"Accept":"application/json","Content-Type":"application/json"}
    data=None if payload is None else json.dumps(payload).encode("utf-8")
    req=urllib.request.Request(url,data=data,headers=headers,method=method)
    with urllib.request.urlopen(req,timeout=30) as resp:
        raw=resp.read().decode("utf-8")
        return json.loads(raw) if raw else {}

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument("--discover",action="store_true")
    ap.add_argument("--publish",action="store_true")
    args=ap.parse_args()
    raw=os.getenv("BUFFER_API_KEY") or os.getenv("BUFFER_ACCESS_TOKEN")
    if not raw:
        print("Buffer API credential unavailable",file=sys.stderr); return 2
    try: key=clean_key(raw)
    except ValueError as e:
        print("BUFFER_CREDENTIAL_INVALID",str(e),file=sys.stderr); return 2

    queue=load(QUEUE); ready=[]; blocked=[]
    for r in queue.get("records",[]):
        why=eligible(r)
        (blocked if why else ready).append({"id":r.get("id"),"reasons":why} if why else r)
    print(f"Queue guard: {len(ready)} eligible; {len(blocked)} blocked.")
    for b in blocked: print("BLOCKED",b["id"],"; ".join(b["reasons"]))

    if args.discover:
        base=os.getenv("BUFFER_API_BASE","https://api.buffer.com")
        paths=[p for p in os.getenv("BUFFER_DISCOVERY_PATHS","/accounts,/channels,/profiles").split(",") if p]
        last=None
        for path in paths:
            try:
                result=request_json(base.rstrip("/")+path.strip(),key)
                print("BUFFER_AUTH_OK",path.strip())
                print(json.dumps(result,indent=2)[:12000])
                return 0
            except urllib.error.HTTPError as e:
                last=e.code
                print(f"BUFFER_DISCOVERY_HTTP_{e.code} {path.strip()}")
            except urllib.error.URLError as e:
                print("BUFFER_NETWORK_ERROR",type(e.reason).__name__,file=sys.stderr); return 4
        print(f"BUFFER_DISCOVERY_FAILED last_http={last}",file=sys.stderr); return 3

    if args.publish:
        if not ready:
            print("No READY records; nothing published."); return 0
        print("Publish path is safety-locked until current API account discovery succeeds.",file=sys.stderr); return 5
    return 0

if __name__=="__main__": raise SystemExit(main())
