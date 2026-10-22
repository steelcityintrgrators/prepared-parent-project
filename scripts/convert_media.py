#!/usr/bin/env python3
"""Normalize Prepared Parent source media into platform-ready derivatives."""
import argparse, json, subprocess
from pathlib import Path

PRESETS={
 "square":(1080,1080),
 "feed":(1080,1350),
 "story":(1080,1920),
 "landscape":(1920,1080),
}

def run(cmd): subprocess.run(cmd,check=True)

def main():
 p=argparse.ArgumentParser()
 p.add_argument("source")
 p.add_argument("--id",required=True)
 p.add_argument("--kind",choices=["image","video"],required=True)
 p.add_argument("--out",default="media/generated")
 a=p.parse_args()
 src=Path(a.source); out=Path(a.out)/a.id; out.mkdir(parents=True,exist_ok=True)
 manifest={"id":a.id,"source":str(src),"kind":a.kind,"assets":[]}
 for name,(w,h) in PRESETS.items():
  if a.kind=="image":
   dest=out/f"{a.id}-{name}.jpg"
   vf=f"scale={w}:{h}:force_original_aspect_ratio=decrease,pad={w}:{h}:(ow-iw)/2:(oh-ih)/2:color=#12263A"
   run(["ffmpeg","-y","-i",str(src),"-vf",vf,"-frames:v","1","-q:v","2",str(dest)])
  else:
   dest=out/f"{a.id}-{name}.mp4"
   vf=f"scale={w}:{h}:force_original_aspect_ratio=decrease,pad={w}:{h}:(ow-iw)/2:(oh-ih)/2:color=#12263A"
   run(["ffmpeg","-y","-i",str(src),"-vf",vf,"-c:v","libx264","-preset","medium","-crf","21","-c:a","aac","-b:a","128k","-pix_fmt","yuv420p","-movflags","+faststart",str(dest)])
  manifest["assets"].append({"preset":name,"width":w,"height":h,"path":str(dest)})
 m=out/"manifest.json"; m.write_text(json.dumps(manifest,indent=2)+"\n")
 print(m)
if __name__=="__main__": main()
