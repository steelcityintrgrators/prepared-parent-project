#!/usr/bin/env python3
import json
from pathlib import Path

SRC=Path("video/briefs/PP-008.json")
OUT=Path("video/openedit/PP-008.production.json")
b=json.loads(SRC.read_text())
if b.get("publishGate")!="READY" or not b.get("sourceUrl"):
    raise SystemExit("FAIL CLOSED: source brief is not publication eligible")
scenes=b.get("scenes") or []
if not scenes: raise SystemExit("FAIL CLOSED: no scenes")
prod={
 "schema":"prepared-parent-video-production/v1",
 "contentId":b.get("sourceContentId") or b.get("id"),
 "generator":"openedit-compatible",
 "format":{"width":1080,"height":1920,"aspect":"9:16","fps":30},
 "brand":{"name":"The Prepared Parent Project","palette":["#12263A","#F4B942","#FFFFFF"],"tagline":"Preparing Alabama parents. Strengthening Alabama families."},
 "contentPolicy":{"factsLocked":True,"mayParaphraseFacts":False,"mayInventClaims":False,"sourceUrl":b["sourceUrl"],"mediaLicense":"ORIGINAL_OR_VERIFIED_LICENSE_ONLY"},
 "creativeDirection":{"style":"premium warm documentary social video","pace":"confident and engaging","captions":"animated high-contrast burned-in captions","visuals":"relevant family preparedness imagery; diverse families; no sensationalism","music":"subtle uplifting instrumental only if licensed","voiceover":"warm clear professional narration"},
 "scenes":[{"index":i+1,"lockedText":s.get("text",""),"durationSeconds":s.get("duration",6),"visualIntent":"Create or select a visually relevant scene supporting the locked text without adding factual claims."} for i,s in enumerate(scenes)],
 "cta":b.get("cta"),"disclaimer":b.get("disclaimer"),
 "targets":["instagram_reel","facebook_video","youtube_short"],
 "status":"DRAFT_REQUIRES_QC"
}
OUT.parent.mkdir(parents=True,exist_ok=True); OUT.write_text(json.dumps(prod,indent=2)+"\n")
print(OUT)
