#!/usr/bin/env python3
"""Buffer API connectivity check for Prepared Parent.

Never logs the API key. Exits non-zero if authentication fails.
"""
import json, os, sys, urllib.request, urllib.error

BASE = os.getenv("BUFFER_API_BASE", "https://api.buffer.com")
TOKEN = os.getenv("BUFFER_ACCESS_TOKEN")

if not TOKEN:
    print("BUFFER_ACCESS_TOKEN is not configured")
    sys.exit(2)

# Buffer's current API is discovered from its API docs; allow endpoint override
# without code changes while keeping credentials secret.
endpoint = os.getenv("BUFFER_CHANNELS_ENDPOINT", "/channels")
url = BASE.rstrip("/") + "/" + endpoint.lstrip("/")
req = urllib.request.Request(
    url,
    headers={
        "Authorization": f"Bearer {TOKEN}",
        "Accept": "application/json",
        "User-Agent": "prepared-parent-project/1.0",
    },
)
try:
    with urllib.request.urlopen(req, timeout=30) as resp:
        raw = resp.read().decode("utf-8", "replace")
        print(f"Buffer authentication HTTP {resp.status}")
        try:
            payload = json.loads(raw)
        except json.JSONDecodeError:
            print("Authenticated response received (non-JSON body withheld).")
            sys.exit(0)
        # Print only non-sensitive channel metadata.
        def walk(obj):
            if isinstance(obj, dict):
                safe={}
                for k,v in obj.items():
                    if k.lower() in {"token","access_token","refresh_token","secret","api_key","key"}:
                        continue
                    if k.lower() in {"id","name","service","network","type","username","handle","display_name"} and isinstance(v,(str,int,bool,type(None))):
                        safe[k]=v
                if safe: print(json.dumps(safe, ensure_ascii=False))
                for v in obj.values(): walk(v)
            elif isinstance(obj, list):
                for v in obj: walk(v)
        walk(payload)
except urllib.error.HTTPError as e:
    print(f"Buffer API HTTP {e.code}: authentication/endpoint check failed")
    sys.exit(1)
except Exception as e:
    print(f"Buffer API connectivity failed: {type(e).__name__}")
    sys.exit(1)
