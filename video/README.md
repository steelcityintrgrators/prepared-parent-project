# Prepared Parent Autonomous Shorts Engine

Free/open-source vertical video renderer. GitHub Actions converts publication-eligible JSON briefs into 1080x1920 MP4 Shorts/Reels using FFmpeg.

Pipeline: verified content -> video brief -> render -> QC -> artifact -> publishing queue.

The renderer is deliberately independent of Canva AI quotas. Canva remains an optional creative layer.

## Safety
Only records with `publishGate: READY` and `videoGate: READY` render. Alabama legal content also requires `VERIFIED — ALABAMA AUTHORITY COMPLETE`. Music is off by default. Third-party media must include license/provenance metadata before use.
