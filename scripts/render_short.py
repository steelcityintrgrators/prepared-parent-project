#!/usr/bin/env python3
import json, subprocess, sys, textwrap
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
BRAND=json.loads((ROOT/"data"/"brand-system.json").read_text())
AUDIO_POLICY=json.loads((ROOT/"data"/"audio-license-policy.json").read_text())
W,H,FPS=1080,1920,30
BG=BRAND["colors"]["navy"]["hex"]
ACCENT=BRAND["colors"]["gold"]["hex"]
WHITE=BRAND["colors"]["white"]["hex"]
FONT="/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
LEFT,RIGHT,TOP,BOTTOM=110,970,260,1450
MAX_CHARS=22
MAX_LINES=5

def wrap_text(s, width=MAX_CHARS):
    lines=[]
    for para in str(s).replace("\\n","\n").splitlines() or [""]:
        lines.extend(textwrap.wrap(para, width=width, break_long_words=False, break_on_hyphens=False) or [""])
    if len(lines)>MAX_LINES:
        raise SystemExit(f"FAIL_CLOSED: scene exceeds {MAX_LINES} readable lines: {s}")
    return "\n".join(lines)

def validate_audio(b):
    audio=b.get("audio") or {"mode":"NONE"}
    mode=audio.get("mode","NONE")
    allowed=AUDIO_POLICY.get("allowedModes",{})
    if mode not in allowed:
        raise SystemExit(f"FAIL_CLOSED: unsupported audio mode {mode}")
    rule=allowed[mode]
    if not rule.get("publishable"):
        raise SystemExit(f"FAIL_CLOSED: audio mode {mode} is not publishable")
    if rule.get("externalLicenseRequired"):
        missing=[k for k in rule.get("requiredFields",[]) if not audio.get(k)]
        if missing:
            raise SystemExit(f"FAIL_CLOSED: royalty-free audio missing provenance fields: {', '.join(missing)}")
        p=ROOT/audio["file"]
        if not p.exists():
            raise SystemExit(f"FAIL_CLOSED: licensed audio file not found: {p}")
    return audio

def render_command(video_filters, duration, audio, out):
    mode=audio.get("mode","NONE")
    cmd=["ffmpeg","-y","-f","lavfi","-i",f"color=c={BG}:s={W}x{H}:r={FPS}:d={duration}"]
    maps=["-map","0:v:0"]
    if mode=="ORIGINAL_SYNTHETIC":
        chord=(
            "aevalsrc="
            "0.06*sin(2*PI*220*t)+"
            "0.045*sin(2*PI*277.18*t)+"
            "0.035*sin(2*PI*329.63*t):"
            f"s=48000:d={duration}"
        )
        cmd += ["-f","lavfi","-i",chord]
        fade=float(AUDIO_POLICY.get("qc",{}).get("fadeSeconds",1.25))
        fade_out=max(0.0,duration-fade)
        volume_db=float(audio.get("targetVolumeDb",AUDIO_POLICY.get("qc",{}).get("defaultTargetVolumeDb",-22)))
        cmd += ["-af",f"afade=t=in:st=0:d={fade},afade=t=out:st={fade_out}:d={fade},volume={volume_db}dB"]
        maps += ["-map","1:a:0"]
    elif mode=="VERIFIED_ROYALTY_FREE":
        audio_file=str(ROOT/audio["file"])
        cmd += ["-stream_loop","-1","-i",audio_file]
        fade=float(AUDIO_POLICY.get("qc",{}).get("fadeSeconds",1.25))
        fade_out=max(0.0,duration-fade)
        volume_db=float(audio.get("targetVolumeDb",AUDIO_POLICY.get("qc",{}).get("defaultTargetVolumeDb",-22)))
        cmd += ["-af",f"afade=t=in:st=0:d={fade},afade=t=out:st={fade_out}:d={fade},volume={volume_db}dB"]
        maps += ["-map","1:a:0"]
    cmd += ["-vf",",".join(video_filters)] + maps + ["-c:v","libx264","-pix_fmt","yuv420p","-movflags","+faststart"]
    if mode!="NONE":
        cmd += ["-c:a","aac","-b:a","128k","-shortest"]
    cmd.append(str(out))
    return cmd

def main():
    if len(sys.argv)<2:
        raise SystemExit("usage: render_short.py BRIEF.json [out.mp4]")
    p=Path(sys.argv[1]); b=json.loads(p.read_text())
    if b.get("publishGate")!="READY" or b.get("videoGate")!="READY":
        raise SystemExit("FAIL_CLOSED: gates not READY")
    if b.get("contentType")=="alabama-legal" and b.get("verificationStatus")!="VERIFIED — ALABAMA AUTHORITY COMPLETE":
        raise SystemExit("FAIL_CLOSED: Alabama legal authority incomplete")
    if b.get("mediaLicense") not in ("ORIGINAL_TEMPLATE_ONLY","VERIFIED_LICENSED_MEDIA"):
        raise SystemExit("FAIL_CLOSED: media provenance missing")
    audio=validate_audio(b)
    out=Path(sys.argv[2] if len(sys.argv)>2 else f"output/{b['id']}.mp4")
    out.parent.mkdir(parents=True,exist_ok=True)

    filters=[
      f"drawbox=x=70:y=105:w=940:h=10:color={ACCENT}:t=fill",
      f"drawtext=fontfile={FONT}:text='THE PREPARED PARENT PROJECT':fontcolor={ACCENT}:fontsize=36:x=(w-text_w)/2:y=145"
    ]
    t=0
    for i,s in enumerate(b["scenes"]):
        start=t; end=t+int(s["seconds"]); t=end
        wrapped=wrap_text(s["text"])
        txtfile=f"/tmp/scene_{i}.txt"; Path(txtfile).write_text(wrapped,encoding="utf-8")
        filters.append(f"drawtext=fontfile={FONT}:textfile={txtfile}:fontcolor={WHITE}:fontsize=54:line_spacing=24:x=(w-text_w)/2:y=(h-text_h)/2:enable='between(t,{start},{end})'")
        filters.append(f"drawtext=fontfile={FONT}:text='{i+1}/{len(b['scenes'])}':fontcolor={ACCENT}:fontsize=30:x=(w-text_w)/2:y=1510:enable='between(t,{start},{end})'")

    end_start=max(0,t-4)
    cta="/tmp/cta.txt"; disclaimer="/tmp/disclaimer.txt"
    Path(cta).write_text(wrap_text(b.get("cta",""),34),encoding="utf-8")
    Path(disclaimer).write_text(wrap_text(b.get("disclaimer",""),42),encoding="utf-8")
    filters.append(f"drawtext=fontfile={FONT}:textfile={cta}:fontcolor={WHITE}:fontsize=34:line_spacing=12:x=(w-text_w)/2:y=1260:enable='between(t,{end_start},{t})'")
    filters.append(f"drawtext=fontfile={FONT}:textfile={disclaimer}:fontcolor={WHITE}:fontsize=25:line_spacing=10:x=(w-text_w)/2:y=1370:enable='between(t,{end_start},{t})'")

    subprocess.run(render_command(filters,t,audio,out),check=True)

    probe=json.loads(subprocess.check_output([
        "ffprobe","-v","error","-show_entries","stream=codec_type,width,height","-of","json",str(out)
    ],text=True))
    streams=probe.get("streams",[])
    video=next((s for s in streams if s.get("codec_type")=="video"),None)
    if not video or (video.get("width"),video.get("height"))!=(W,H):
        raise SystemExit(f"FAIL_CLOSED: bad video dimensions {video}")
    if audio.get("mode")!="NONE" and not any(s.get("codec_type")=="audio" for s in streams):
        raise SystemExit("FAIL_CLOSED: audio stream missing")
    print(out)

if __name__=="__main__":
    main()
