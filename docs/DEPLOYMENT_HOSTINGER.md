# Hostinger Deployment

Target baseline: 2 vCPU, 8 GB RAM, 100 GB NVMe; tune from measurements. Only ports 80/443 public. PostgreSQL and Redis stay on the internal Docker network. Traefik terminates TLS. Configure domain names and secrets outside Git, then run `docker compose -f docker-compose.production.yml up -d`.

Production promotion requires health checks, migrations, tested restore, log rotation, resource limits, and monitoring for CPU/RAM/disk, DB connections, Redis, queues, and API latency.
