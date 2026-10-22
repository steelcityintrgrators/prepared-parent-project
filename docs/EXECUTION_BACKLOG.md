# Prepared Parent Execution Backlog

**Last verified:** October 22, 2026  
**Scope:** Public website, content verification, media production, publishing, live verification, analytics, and operational automation.

## Status definitions

- **WORKING** — demonstrated functional in the real environment.
- **PARTIAL** — useful capability exists, but required acceptance criteria remain open.
- **BROKEN** — implemented capability currently fails its required test.
- **MISSING** — no implemented capability was found.
- **BLOCKED** — completion requires an external authorization, credential, professional decision, payment, or physical-world action.
- **UNVERIFIED** — a claim or artifact exists, but current evidence does not prove the real-world result.

## Current state

| Component | Lifecycle stage reached | Status | Verified evidence / open condition |
|---|---|---|---|
| Public website | VERIFIED LIVE | WORKING | GitHub Pages deployment and live browser inspection completed. |
| Non-law-firm / educational disclaimer | VERIFIED LIVE | WORKING | Homepage and disclaimer page state that the project is not a law firm and does not provide legal advice. |
| Situation-aware navigator | VERIFIED LIVE | WORKING | Live interactive routing distinguishes topic, order status, procedural stage, and urgent-safety selection. |
| Official resource directory | VERIFIED LIVE | PARTIAL | Curated official links are live; automated link-health and freshness checks are not yet recorded. |
| Alabama legal publication gate | TESTED | WORKING | Validation blocks Alabama legal records from READY without the required authority-verification status. |
| General content library | BUILT | PARTIAL | Source-reviewed topics exist; automatic topic discovery and freshness revalidation remain open. |
| Video renderer | TESTED | PARTIAL | Produces a 1080×1920, 30-second branded text video. Voice, richer motion/visuals, and human visual approval remain open. |
| Media provenance gate | TESTED | WORKING | Renderer fails closed unless media is original-template-only or verified licensed media. |
| Buffer authentication / channel discovery | TESTED | WORKING | Facebook, Instagram, and YouTube channel discovery passed in GitHub Actions. |
| Controlled social publishing | DEPLOYED | PARTIAL | Test publishing capability exists, but the queue state does not reliably record resulting post IDs and live URLs. |
| Live post verification | UNVERIFIED | MISSING | No durable automated proof that each public post is reachable and correct after publishing. |
| Analytics collection | DESIGNED | MISSING | No durable cross-platform metrics collector or normalized measurement record was found. |
| Performance learning loop | PROMISED | MISSING | No implementation selects future topics/formats using verified performance data. |
| Recurring autonomous content run | DESIGNED | MISSING | No safe schedule currently executes discovery → verification → production → QC → publishing → verification → analytics. |
| Nonprofit legal formation | DESIGNED | BLOCKED | Formation package is a draft; entity filing, EIN, exemption application, independent director acceptance, registered-agent details, counsel review, and outside fee sponsorship remain external gates. |

## Highest-priority backlog

### P0 — Truth, safety, and recovery

- [x] Remove automatic test-post publication from the Buffer discovery workflow.
- [x] Rename and scope the technical proof so it does not claim live publishing, verification, analytics, or visual review.
- [ ] Persist every publication attempt with content ID, platform, returned post ID, timestamp, result, retry count, and public URL when available.
- [ ] Add idempotency so reruns cannot create duplicate posts for the same content/platform/version.
- [ ] Add retry rules that distinguish transient platform failure from content rejection or authorization failure.
- [ ] Add failure alerts that contain no credentials or private participant data.
- [ ] Perform and record a repository restore test.

### P1 — Acceptance-test completion

- [ ] Add automated live-post verification for Facebook, Instagram, and YouTube.
- [ ] Add automated technical QC for audio presence, loudness, duration, resolution, codec, captions, and safe-zone constraints.
- [ ] Add visual-QA evidence capture and a human-review checkpoint before scheduled public release.
- [ ] Add a professional voice track using a rights-cleared, privacy-safe TTS or recorded-voice workflow.
- [ ] Upgrade the renderer from static text scenes to branded motion graphics and original/licensed visual assets.
- [ ] Create reusable 9:16, 1:1, and 16:9 brand templates and verify each platform crop.
- [ ] Normalize post-performance metrics into a versioned analytics record.
- [ ] Implement topic and format recommendations from performance data without overriding legal/safety gates.

### P2 — Content and authority operations

- [ ] Add automated freshness checks for every official source URL and record last-verified dates.
- [ ] Add an Alabama appellate-authority research record with citation, holding, pinpoint support, factual distinctions, current treatment, reviewer, and verification date.
- [ ] Keep high-risk Alabama legal content blocked until qualified human legal/safety review is recorded.
- [ ] Add editorial checks for plain-language accuracy, accessibility, neutrality, and privacy.
- [ ] Expand the source-reviewed general-content queue before enabling a recurring publishing schedule.

### P3 — Growth and funding infrastructure

- [ ] Add consent-based email capture, privacy notice, retention policy, and unsubscribe handling before collecting personal data.
- [ ] Establish sponsor/donor outreach only after entity-status language and fiscal-sponsorship boundaries are verified.
- [ ] Complete formation only after the required identity, address, board, legal, funding, and signature decisions are made.
- [ ] Add conversion analytics for resource use, email opt-in, workshop interest, and partner referrals.

## Definition of done for autonomous content

A content automation is complete only when it repeatedly:

1. selects an appropriate topic from verified demand and source data;
2. confirms source freshness and applicable legal/safety gates;
3. produces platform-ready branded copy and media;
4. passes factual, legal, privacy, technical, and visual quality checks;
5. publishes exactly once to each approved channel;
6. verifies the public result and records durable evidence;
7. measures performance using normalized metrics;
8. applies documented learning to future topic and format selection; and
9. reports only meaningful exceptions and outcomes.

A successful render, authenticated channel, accepted API call, or successful workflow run is an intermediate stage—not completion.
