# Security

Current vertical slice verifies signed access tokens, rotates hashed refresh tokens, validates payloads and UUID mutation IDs, applies request limits/secure headers, uses parameterized PostgreSQL queries, checks resource ownership, avoids sensitive analytics, and calculates progress server-side. Production hardening still requires a shared rate-limit store for multi-instance scaling, audit logs, secret rotation, database backup/restore drills, monitoring, and regular authorization/privacy negative tests.

Threat tests: IDOR/BOLA on daily entries and circles, role escalation, invite replay, mutation replay, refresh-token theft, enumeration, oversized request, and unauthorized detail visibility.
