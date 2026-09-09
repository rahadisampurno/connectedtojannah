# Security

Current vertical slice validates UUID mutation IDs, applies request limits/secure headers, avoids sensitive analytics, and calculates progress server-side. Production gate requires JWT verification, rotating hashed refresh tokens, rate limiting, DTO validation, Prisma parameterization, audit logs, ownership checks, and field-level privacy projection.

Threat tests: IDOR/BOLA on daily entries and circles, role escalation, invite replay, mutation replay, refresh-token theft, enumeration, oversized request, and unauthorized detail visibility.
