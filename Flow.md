 Here is the current implemented flow (excluding tests), end-to-end.

**Startup**
- App boots in app.ts: loads env, creates Express app, mounts API router, and starts services.
- On startup it initializes telemetry storage first, then starts MQTT ingestion.
- Startup now logs active store type (`postgres` or `noop`) so runtime mode is visible.

**Configuration**
- MQTT connection + reconnect settings come from env via mqtt.config.ts.
- Telemetry store type is chosen from env in telemetry.Store.ts:
  - `TELEMETRY_STORE=postgres` → Postgres adapter
  - otherwise → no-op adapter
- Postgres pool and table/schema names are also read from env in the same store factory.

**MQTT Ingestion Pipeline**
- MQTT client lifecycle, reconnect, subscribe, and message dispatch are handled in mqtt.Repository.ts.
- Ingestion orchestrator is mqttIngestion.service.ts:
  - subscribes to `sensors/#` and `status/running`
  - parses incoming JSON
  - updates latest in-memory maps
  - writes asynchronously to the selected telemetry store

**Parsing and Domain Mapping**
- Topic + payload parsing lives in mqttParsing.service.ts.
- Sensor model mapping in sensorReading.model.ts:
  - core fields (`mcuId`, `sensorType`, `sensorId`, `timestamp`, optional `tempC`)
  - numeric unknown fields → `metrics`
  - non-numeric unknown fields → `extras`
  - full original payload copy → `raw`
- Chip status mapping is in chipStatus.model.ts.

**Storage Layer**
- Store contract (`TelemetryStore`) is defined in telemetry.Store.ts.
- Default safe implementation is `NoopTelemetryStore`.
- Concrete DB adapter is PostgresTelemetryStore.ts:
  - `initialize()` creates tables/indexes if missing
  - `saveSensorReading()` inserts sensor rows
  - `saveChipStatus()` inserts status rows
  - `checkHealth()` runs `SELECT 1`
- Your current env uses Postgres, so writes are going to `public.sensor_readings` and `public.chip_statuses`.

**API Surface**
- Router is api.routes.ts, handlers in mqttIngestion.controller.ts.
- Current endpoints:
  - `/health` (app liveness)
  - `/api` (endpoint listing)
  - `/api/latest-readings` (latest in-memory sensor snapshots)
  - `/api/status` (latest in-memory chip status snapshots)
  - `/api/db-health` (telemetry store health; Postgres does live DB ping)

If you want, next I can outline the same flow as a compact diagram-style sequence (Publisher → MQTT → Parser → Memory + DB → API).

## As-Built Flow Diagram

```mermaid

---
flowchart TD
  A[ENV_STEPS publishers / devices] -->|MQTT messages| B[MQTT Broker]
  B --> C[MqttRepository]
  C --> D[MqttIngestionService]

  D --> E[Topic + payload parsing]
  E --> F[SensorReading / ChipStatus domain mapping]

  F --> G[Latest in-memory state]
  F --> H[TelemetryStore abstraction]

  H -->|TELEMETRY_STORE=noop| I[NoopTelemetryStore]
  H -->|TELEMETRY_STORE=postgres| J[PostgresTelemetryStore]

  J --> K[initialize()]
  K --> L[(Postgres: sensor_readings, chip_statuses)]
  J --> L

  M[Express API] --> N[/health]
  M --> O[/api]
  M --> P[/api/latest-readings]
  M --> Q[/api/status]
  M --> R[/api/db-health]

  P --> G
  Q --> G
  R --> H
```

### Runtime sequence (compact)

1. `app.ts` starts, initializes telemetry store, then starts MQTT ingestion.
2. `mqtt.Repository.ts` connects/subscribes and forwards MQTT messages.
3. `mqttIngestion.service.ts` parses and maps payloads.
4. Parsed data is written to latest in-memory maps and to the selected telemetry store.
5. `PostgresTelemetryStore` persists into `sensor_readings` and `chip_statuses`.
6. API returns latest snapshots and DB health via `/api/*` endpoints.

## Runtime Sequence Diagram

```mermaid
sequenceDiagram
  autonumber
  participant Device as ENV_STEPS Device
  participant Broker as MQTT Broker
  participant Repo as MqttRepository
  participant Ingest as MqttIngestionService
  participant Parse as mqttParsing.service
  participant Store as TelemetryStore
  participant PG as PostgresTelemetryStore
  participant API as Express API

  Device->>Broker: Publish telemetry/status
  Broker->>Repo: Deliver topic + payload
  Repo->>Ingest: messageHandler(topic, payload)
  Ingest->>Parse: parseSensorPayload / parseChipStatusPayload
  Parse-->>Ingest: SensorReading / ChipStatus

  Ingest->>Ingest: Update latest in-memory maps
  Ingest->>Store: saveSensorReading / saveChipStatus
  Store->>PG: Route to postgres adapter
  PG->>PG: INSERT into sensor_readings / chip_statuses

  API->>Ingest: GET /api/latest-readings or /api/status
  Ingest-->>API: Latest snapshots

<!-- [MermaidChart: 72c2a499-75ad-4315-96c4-17e6096c88ce] -->
<!-- [MermaidChart: 72c2a499-75ad-4315-96c4-17e6096c88ce] -->
<!-- [MermaidChart: 72c2a499-75ad-4315-96c4-17e6096c88ce] -->
<!-- [MermaidChart: 72c2a499-75ad-4315-96c4-17e6096c88ce] -->
<!-- [MermaidChart: 7643be14-1ee1-4deb-8571-9d5b9e9d8190] -->
<!-- [MermaidChart: 7643be14-1ee1-4deb-8571-9d5b9e9d8190] -->
  API->>Store: GET /api/db-health
  Store->>PG: checkHealth()
  PG-->>Store: SELECT 1 OK
  Store-->>API: { ok: true, storeType: "postgres" }
```


