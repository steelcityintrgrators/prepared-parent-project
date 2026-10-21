# Buffer Runtime v1

This runtime is fail-closed.

- Default mode is dry-run.
- Only records marked `READY` can ever become eligible.
- Alabama legal content additionally requires `VERIFIED — ALABAMA AUTHORITY COMPLETE`.
- Source URL, finalized copy and asset readiness are mandatory.
- Publishing remains disabled until Buffer authentication/channel discovery succeeds and each target channel passes a controlled test.
- Credentials exist only in GitHub Actions secrets.

## Workflow

Run **Buffer API Discovery** manually. It validates the queue first and then makes a read-only authenticated discovery request. It does not publish content.

The API base/path can be overridden with environment variables if Buffer's current API endpoint differs:
`BUFFER_API_BASE` and `BUFFER_DISCOVERY_PATH`.
