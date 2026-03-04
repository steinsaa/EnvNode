# EnvNode Docker Deployment

This project now includes a minimal Docker deployment setup for running EnvNode as a containerized service.

## Files

- `Dockerfile` builds and runs the compiled TypeScript app.
- `docker-compose.yml` runs one service: `envnode`.
- `.dockerignore` keeps build context small.

## Prerequisites

- Docker Engine + Docker Compose plugin installed.
- Reachable MQTT broker and Postgres instance.
- A valid `.env` file in project root.

## 1) Prepare environment

1. Copy `.env.example` to `.env`.
2. Set MQTT and Postgres values for your server.
3. Ensure `TELEMETRY_STORE=postgres` for DB persistence.

## 2) Build and run locally (or on server)

```bash
docker compose up -d --build
```

Check status and logs:

```bash
docker compose ps
docker compose logs -f envnode
```

Stop:

```bash
docker compose down
```

## 3) Verify service

With container running, test:

- `GET http://<host>:3000/health`
- `GET http://<host>:3000/api`
- `GET http://<host>:3000/api/db-health`

## 4) Deploy from this VS Code workspace to your Docker host

If your Docker server is separate from your dev machine:

1. Copy project files to the server (git clone or rsync/scp).
2. Create/update `.env` on the server with server-local hostnames.
3. Run `docker compose up -d --build` from project root on that server.

## Notes

- Compose uses values from `.env` and maps API port `3000:3000`.
- If MQTT/Postgres run in other containers, set `MQTT_HOST` and `PGHOST` to names/IPs reachable from the `envnode` container.