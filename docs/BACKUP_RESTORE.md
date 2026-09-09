# Backup and Restore

Run `scripts/backup.sh` nightly, copy encrypted archives off-server, and retain 7 daily, 4 weekly, 3 monthly. A backup is valid only after a restore drill with `scripts/restore.sh` into an isolated database and application smoke test.
