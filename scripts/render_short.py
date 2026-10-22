#!/usr/bin/env python3
import json, subprocess, sys
from pathlib import Path

W,H,FPS=1080,1920,30
BG="#12263A"
ACCENT="#F4B942"
WHITE="#FFFFFF"

def esc(s):
    return s.replace("\\","\\\\").replace(":","\\:").replace("'","\\'").replace("%","\\%").replace("\n","\\n")

def main():
    if len(sys.argv)<2: raise SystemExit("usage: render_short.py BRIEF.json [out.mp4]")
    p=Path(sys.argv[1]); b=json.loads(p.read_text())
    if b.get("publishGate")!="READY" or b.get("videoGate")!="READY": raise SystemExit("FAIL_CLOSED: gates not READY")
    if b.get("contentType")=="alabama-legal" and b.get("verificationStatus")!="VERIFIED — ALABAMA AUTHORITY COMPLETE": raise SystemExit("FAIL_CLOSED: Alabama legal authority incomplete")
    if b.get("mediaLicense") not in ("ORIGINAL_TEMPLATE_ONLY","VERIFIED_LICENSED_MEDIA"): raise SystemExit("FAIL_CLOSED: media provenance missing")
    out=Path(sys.argv[2] if len(sys.argv)>2 else f"output/{b['id']}.mp4"); out.parent.mkdir(parents=True,exist_ok=True)
    filters=[]; t=0
    font="/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
    filters.append(f"drawbox=x=70:y=120:w=940:h=12:color={ACCENT}:t=fill")
    filters.append(f"drawtext=fontfile={font}:text='THE PREPARED PARENT PROJECT':fontcolor={ACCENT}:fontsize=42:x=(w-text_w)/2:y=175")
    for i,s in enumerate(b["scenes"]):
        start=t; end=t+int(s["seconds"]); t=end
        txt=esc(s["text"])
        filters.append(f"drawtext=fontfile={font}:text='{txt}':fontcolor={WHITE}:fontsize=64:line_spacing=20:x=(w-text_w)/2:y=(h-text_h)/2:enable='between(t,{start},{end})'")
        filters.append(f"drawtext=fontfile={font}:text='{i+1}/{len(b['scenes'])}':fontcolor={ACCENT}:fontsize=34:x=(w-text_w)/2:y=1600:enable='between(t,{start},{end})'")
    filters.append(f"drawtext=fontfile={font}:text='{esc(b.get('cta',''))}':fontcolor={WHITE}:fontsize=30:x=(w-text_w)/2:y=1740")
    filters.append(f"drawtext=fontfile={font}:text='{esc(b.get('disclaimer',''))}':fontcolor={WHITE}:fontsize=24:x=(w-text_w)/2:y=1800")
    cmd=["ffmpeg","-y","-f","lavfi","-i",f"color=c={BG}:s={W}x{H}:r={FPS}:d={t}","-vf",",".join(filters),"-c:v","libx264","-pix_fmt","yuv420p","-movflags","+faststart",str(out)]
    subprocess.run(cmd,check=True)
    subprocess.run(["ffprobe","-v","error","-show_entries","format=duration","-of","default=nw=1:nk=1",str(out)],check=True)
    print(out)

if __name__=="__main__": main()
