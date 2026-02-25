# EnvNode Handover

## Project Snapshot

- Stack: Node.js + TypeScript + Express + MQTT + PostgreSQL.
- Runtime flow: MQTT ingest -> parse/map -> in-memory latest cache + telemetry store persistence.
- Persistence mode is env-driven via `TELEMETRY_STORE` (`noop` or `postgres`).
- Current working state: Postgres persistence active, startup initialization active, DB health endpoint active.

## Current Architecture (As Implemented)

1. App startup (`src/app.ts`)
   - Loads env (`dotenv/config`).
   - Builds Express app and routes.
   - Initializes telemetry store (`initializeTelemetryStore()`).
   - Logs active store type (`getTelemetryStoreType()`).
   - Starts MQTT ingestion.

2. MQTT ingestion (`src/services/mqttIngestion.service.ts`)
   - Subscribes to:
     - `sensors/#`
     - `status/running`
   - Parses incoming payloads with `mqttParsing.service.ts`.
   - Updates latest in-memory state maps.
   - Persists asynchronously through `TelemetryStore`.

3. Parsing and models
   - Sensor parsing supports unknown future keys:
     - numeric -> `metrics`
     - non-numeric -> `extras`
     - full payload -> `raw`
   - Models in `src/models/`.

4. Storage abstraction (`src/repositories/telemetry.Store.ts`)
   - `TelemetryStore` interface.
   - `NoopTelemetryStore` default safe implementation.
   - Env-based factory creates Postgres store when enabled.
   - Health helper for API (`getTelemetryStoreHealth`).

5. Postgres adapter (`src/repositories/PostgresTelemetryStore.ts`)
   - `initialize()` creates tables/indexes if missing.
   - `saveSensorReading()` inserts sensor telemetry.
   - `saveChipStatus()` inserts status telemetry.
   - `checkHealth()` runs `SELECT 1`.

6. API surface
   - Router: `src/routes/api.routes.ts`
   - Controller: `src/controllers/mqttIngestion.controller.ts`
   - Endpoints:
     - `/health`
     - `/api`
     - `/api/latest-readings`
     - `/api/status`
     - `/api/db-health`

## Key Files To Read First

- `Flow.md`
- `src/app.ts`
- `src/services/mqttIngestion.service.ts`
- `src/services/mqttParsing.service.ts`
- `src/repositories/telemetry.Store.ts`
- `src/repositories/PostgresTelemetryStore.ts`
- `src/repositories/mqtt.Repository.ts`
- `src/routes/api.routes.ts`
- `src/controllers/mqttIngestion.controller.ts`
- `src/models/sensorReading.model.ts`

## Environment Baseline (Current)

- MQTT:
  - `MQTT_HOST`, `MQTT_PORT`, `MQTT_PROTOCOL`, `MQTT_USERNAME`, `MQTT_PASSWORD`
  - reconnect envs configured
- Postgres:
  - `TELEMETRY_STORE=postgres`
  - `PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, `PGDATABASE`
  - optional table/schema envs configured
  - `PGSSL=false` for non-SSL server

## Operational Notes

- If Postgres is selected, startup calls `initialize()` and auto-creates required tables/indexes.
- `/api/db-health` is the runtime check for telemetry store health.
- Build command: `npm run build`
- Typical run command: `npm start`

## Working Style Preference (User)

- Implement changes one step at a time.
- Explain intent briefly before each step.
- Keep changes small and verifiable.

## Suggested Next Steps

- Add historical query repository/endpoints (time-range, by `mcuId`/`sensorId`).
- Add retention/downsampling strategy for long-term telemetry growth.
- Add lightweight startup diagnostics (db host/db name/store mode) in logs.

## New Chat Starter Prompt (Copy/Paste)

Continue EnvNode from current state. Read `HANDOVER.md` and `Flow.md` first, then inspect the key files listed there before proposing code changes. Keep a one-step-at-a-time workflow with brief explanations before each implementation step. Current status: MQTT ingest + parser + in-memory latest + Postgres persistence + `/api/db-health` are working.
