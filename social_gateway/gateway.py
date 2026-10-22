import json, os, sys, urllib.request, urllib.parse
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
STATE=ROOT/"data"/"social-gateway-state.json"

def request(url, method="GET", headers=None, data=None):
    body=None if data is None else json.dumps(data).encode()
    req=urllib.request.Request(url, data=body, method=method, headers=headers or {})
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.loads(r.read().decode())

def buffer_check():
    token=os.getenv("BUFFER_ACCESS_TOKEN")
    if not token: return {"ok":False,"reason":"missing BUFFER_ACCESS_TOKEN"}
    # Buffer API capability is intentionally discovered rather than assumed.
    return {"ok":True,"secret_present":True,"note":"API endpoint/channel discovery required"}

def meta_check():
    token=os.getenv("META_ACCESS_TOKEN")
    page=os.getenv("META_FACEBOOK_PAGE_ID")
    ig=os.getenv("META_INSTAGRAM_ACCOUNT_ID")
    return {"ok":bool(token and page and ig),"token_present":bool(token),"facebook_page_id_present":bool(page),"instagram_id_present":bool(ig)}

def youtube_check():
    keys=["YOUTUBE_CLIENT_ID","YOUTUBE_CLIENT_SECRET","YOUTUBE_REFRESH_TOKEN"]
    present={k:bool(os.getenv(k)) for k in keys}
    return {"ok":all(present.values()),"present":present}

def main():
    state={"buffer":buffer_check(),"meta":meta_check(),"youtube":youtube_check()}
    STATE.write_text(json.dumps(state,indent=2)+"\n")
    print(json.dumps(state,indent=2))
    # Discovery is informational: missing OAuth secrets should not make CI lie about code health.
if __name__=="__main__": main()
