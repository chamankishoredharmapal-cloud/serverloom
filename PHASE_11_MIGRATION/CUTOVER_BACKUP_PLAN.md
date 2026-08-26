# CUTOVER_BACKUP_PLAN.md (Phase 11.11)

## Source side (external)

`db.sqlite3` is a 0-byte placeholder — preserved AS-IS where it lies (no deletion performed). Archive instruction for retention: zip the entire `serverloom-main/` tree once and store alongside L3 dumps; checksum recorded at archival time.

## Target side (Management-V1 / Supabase)

| Requirement | Action before go-live |
| ----------- | --------------------- |
| Backup exists | enable Supabase daily backups (Pro tier) — verify dashboard shows first successful snapshot |
| Restore works | FIRST restore drill: snapshot → shadow project → validation checklist → evidence recorded (Phase 8 BACKUP_RECOVERY_PLAN ritual) |
| Off-site copy | weekly `pg_dump` to private storage bucket (L3), separate credentials |
| Checksums/sizes | record SHA-256 + byte size of every dump artifact in ops log |
| Location safety | private bucket, versioning on, separate credential from app |

Rule enforced: production primary-status is denied until the restore drill has RECORDED EVIDENCE ("never assume backup = recovery").
