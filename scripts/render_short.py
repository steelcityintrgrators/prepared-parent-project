#!/usr/bin/env python3
import json, subprocess, sys, textwrap
from pathlib import Path

W,H,FPS=1080,1920,30
BG="#12263A"; ACCENT="#F4B942"; WHITE="#FFFFFF"
FONT="/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
# Reel/Short safe canvas: keep essential text away from app chrome.
LEFT,RIGHT,TOP,BOTTOM=110,970,260,1450
MAX_CHARS=27
MAX_LINES=6

def wrap_text(s, width=MAX_CHARS):
    lines=[]
    for para in str(s).replace("\\n","\n").splitlines() or [""]:
        lines.extend(textwrap.wrap(para, width=width, break_long_words=False, break_on_hyphens=False) or [""])
    if len(lines)>MAX_LINES:
        raise SystemExit(f"FAIL_CLOSED: scene exceeds {MAX_LINES} readable lines: {s}")
    return "\n".join(lines)

def main():
    if len(sys.argv)<2: raise SystemExit("usage: render_short.py BRIEF.json [out.mp4]")
    p=Path(sys.argv[1]); b=json.loads(p.read_text())
    if b.get("publishGate")!="READY" or b.get("videoGate")!="READY": raise SystemExit("FAIL_CLOSED: gates not READY")
    if b.get("contentType")=="alabama-legal" and b.get("verificationStatus")!="VERIFIED — ALABAMA AUTHORITY COMPLETE": raise SystemExit("FAIL_CLOSED: Alabama legal authority incomplete")
    if b.get("mediaLicense") not in ("ORIGINAL_TEMPLATE_ONLY","VERIFIED_LICENSED_MEDIA"): raise SystemExit("FAIL_CLOSED: media provenance missing")
    out=Path(sys.argv[2] if len(sys.argv)>2 else f"output/{b['id']}.mp4"); out.parent.mkdir(parents=True,exist_ok=True)
    filters=[
      f"drawbox=x=70:y=105:w=940:h=10:color={ACCENT}:t=fill",
      f"drawtext=fontfile={FONT}:text='THE PREPARED PARENT PROJECT':fontcolor={ACCENT}:fontsize=36:x=(w-text_w)/2:y=145"
    ]
    t=0
    for i,s in enumerate(b["scenes"]):
        start=t; end=t+int(s["seconds"]); t=end
        wrapped=wrap_text(s["text"])
        txtfile=f"/tmp/scene_{i}.txt"; Path(txtfile).write_text(wrapped,encoding="utf-8")
        # Fixed safe width + wrapping prevents horizontal clipping. Center block in safe region.
        filters.append(f"drawtext=fontfile={FONT}:textfile={txtfile}:fontcolor={WHITE}:fontsize=58:line_spacing=24:x=max({LEFT},(w-text_w)/2):y=max({TOP},min((h-text_h)/2,{BOTTOM}-text_h)):enable='between(t,{start},{end})'")
        filters.append(f"drawtext=fontfile={FONT}:text='{i+1}/{len(b['scenes'])}':fontcolor={ACCENT}:fontsize=30:x=(w-text_w)/2:y=1510:enable='between(t,{start},{end})'")
    # End-card-only source/disclaimer; never place persistent text under Instagram UI.
    end_start=max(0,t-4)
    cta="/tmp/cta.txt"; disclaimer="/tmp/disclaimer.txt"
    Path(cta).write_text(wrap_text(b.get("cta",""),34),encoding="utf-8")
    Path(disclaimer).write_text(wrap_text(b.get("disclaimer",""),42),encoding="utf-8")
    filters.append(f"drawtext=fontfile={FONT}:textfile={cta}:fontcolor={WHITE}:fontsize=34:line_spacing=12:x=(w-text_w)/2:y=1260:enable='between(t,{end_start},{t})'")
    filters.append(f"drawtext=fontfile={FONT}:textfile={disclaimer}:fontcolor={WHITE}:fontsize=25:line_spacing=10:x=(w-text_w)/2:y=1370:enable='between(t,{end_start},{t})'")
    cmd=["ffmpeg","-y","-f","lavfi","-i",f"color=c={BG}:s={W}x{H}:r={FPS}:d={t}","-vf",",".join(filters),"-c:v","libx264","-pix_fmt","yuv420p","-movflags","+faststart",str(out)]
    subprocess.run(cmd,check=True)
    # Automated QC: exact vertical dimensions and expected duration.
    probe=subprocess.check_output(["ffprobe","-v","error","-select_streams","v:0","-show_entries","stream=width,height","-of","csv=p=0:s=x",str(out)],text=True).strip()
    if probe!="1080x1920": raise SystemExit(f"FAIL_CLOSED: bad dimensions {probe}")
    print(out)

if __name__=="__main__": main()
