# Backup and Recovery Standard

## Protected asset
Repository: `steelcityintrgrators/prepared-parent-project`

## Backup rule
Maintain three recoverable copies:
1. GitHub working repository with full commit history.
2. Weekly mirror backup stored outside GitHub.
3. Monthly encrypted offline copy.

## Weekly backup
Use an authenticated administrator workstation:

```bash
git clone --mirror https://github.com/steelcityintrgrators/prepared-parent-project.git
git -C prepared-parent-project.git fsck --full
```

If Git LFS is later enabled, also run `git lfs fetch --all`.

Compress the mirrored repository, record a SHA-256 checksum, and store it in the project's **90 - Backups and Recovery** folder. Never include passwords, API keys, production database exports, or unencrypted personal data in an ordinary archive.

## Recovery test
Quarterly:
1. Restore the mirror into an isolated temporary repository.
2. Confirm branches, tags, and recent commits.
3. Run the project's validation or build checks.
4. Record the date, tester, commit SHA, result, and corrective action.

## Recovery priorities
1. Source code and version history.
2. Deployment configuration with secret values removed.
3. Documentation and release assets.
4. External service and domain inventory.
5. Database recovery from a separately encrypted backup.

A synchronized folder is not an independent backup if deletions propagate to every copy.
