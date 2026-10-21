# Buffer Publishing Integration

## Objective
Use Buffer as the $0 social distribution layer for The Prepared Parent Project while preserving legal-verification and editorial gates.

Target channels:
- Facebook — The Prepared Parent Project
- Instagram — @thepreparedparentproject
- YouTube — @ThePreparedParentProject

## Operating pipeline
1. Topic enters the existing Prepared Parent content calendar.
2. Source verification runs.
3. Alabama legal/court content must pass the Legal Search & Verification Standard.
4. General content must have a reviewed source and editorial status.
5. Caption/script is generated.
6. Canva asset is produced.
7. A publish-ready record is created in the publishing queue.
8. Buffer receives only records whose publish gate is READY.
9. Publication result and public URL are written back to the performance log.
10. Engagement data informs the next content cycle.

## Hard publishing gates
A record MUST NOT be sent to Buffer if:
- publish gate is not READY;
- an Alabama legal claim is CASE-LAW REVIEW REQUIRED, CONFLICT / DISTINCTION REVIEW REQUIRED, or UNVERIFIED;
- a required source URL is missing;
- media is missing for a media-required post;
- a legal disclaimer is required but absent;
- the target channel has not passed a controlled publishing test.

## Secrets
Never commit Buffer credentials, access tokens, API keys, Meta tokens, Google/YouTube tokens, or Canva credentials to GitHub.

When an API credential is available, store it only as an encrypted deployment secret/environment variable. Suggested names:
- BUFFER_ACCESS_TOKEN
- BUFFER_PROFILE_FACEBOOK
- BUFFER_PROFILE_INSTAGRAM
- BUFFER_PROFILE_YOUTUBE

## Current integration state
- Buffer account: created by owner.
- Facebook channel: owner reports connected.
- Instagram channel: owner reports connected.
- YouTube channel: owner reports connected.
- Direct Buffer tool/API from ChatGPT: not yet connected.
- Production publishing: MUST remain in controlled-test mode until one test post is verified on each target channel.

## First test sequence
1. Select a low-risk general-resource item.
2. Create/confirm Canva asset.
3. Generate platform-specific copy.
4. Mark queue record READY.
5. Publish Facebook + Instagram test.
6. Verify public post URLs and rendering.
7. Publish YouTube Shorts test.
8. Verify title, description, channel, media format, and public URL.
9. Mark each channel TESTED.
10. Begin rolling 7–10-post queue.

## Autonomous mode
After the API/tool bridge is available and all channels pass testing:
- only READY records may be scheduled automatically;
- legal-gated records remain blocked;
- failed posts retry only when the failure is clearly transient;
- authorization/permission failures create an owner-action item rather than repeated retries;
- the system records platform, scheduled time, published time, external post ID/URL, and failure reason.
