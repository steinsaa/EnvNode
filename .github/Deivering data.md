
# EnvNode Project Status

## Project Structure

**Core Application**
- `app.ts` - Main application entry point

**Configuration**
- `mqtt.config.ts` - MQTT configuration settings

**Data Layer**
- `models/` - Data models (chipStatus, sensorReading)
- `repositories/` - Data repositories (mqtt.Repository)

**Business Logic**
- `services/` - Business services
    - `mqttIngestion.service.ts` - Data ingestion
    - `mqttParsing.service.ts` - Data parsing

**API**
- `routes/` - API route definitions
- `controllers/` - Request handlers

**Testing**
- `__tests__/` - Test suite
    - MQTT tests
    - Parsing service tests
    - Repository tests
    - Smoke tests

**Utilities**
- `utils/` - Helper functions


** Current completion status **
  *MQTT*
  -  repository complete
  -  subscribe tested and used by service level
  -  topic and message parsing tested (`mqttParsing.service`)
  -  ingestion of data published from the ENV_STEPS project are used and tested in service level (`mqttIngestion.service`)
  -  temporary endpoints (/api/latest-readings and /api/status) for testing ingestion added to `app.ts` 

- Known issues or blockers
  - endpoints in app.ts,  move to /routes ?
- Team assignments
  
## Next Steps

**Evaluate and further detail the plan existing**
  *Data destination*
  - define historical/runtime data. 
  *database*
  - timeseries database really needed?
    - currently only sensor reading are to be stored, none of which need to be fetched more than one pr minute or so.
    - however ams data may be added, which come every ten seconds. 
  - local or cloud
  - Postgresql or other?
  *client(s)*
  - websocket and API are both to be offered to clients.
    - chose web socket library to use by our ts code
  - 

## API Contract (Current Temporary Endpoints)

### `GET /api/latest-readings`

Returns an array of `SensorReading` objects (latest value per `mcuId:sensorId`).

```json
[
  {
    "mcuMac": "e0:e2:e6:9d:0f:04",
    "mcuId": "test3",
    "sensorType": "dht22",
    "sensorId": "dht22",
    "timestamp": "2026-02-15T16:40:20.000Z",
    "tempC": 27.6,
    "metrics": {
      "humidity": 26.7
    },
    "extras": {
      "unit": "percent",
      "calibrated": true
    },
    "raw": {
      "MCU_mac": "e0:e2:e6:9d:0f:04",
      "MCU_id": "test3",
      "sensor_type": "dht22",
      "epoch_s": 1771170020,
      "temp_c": 27.6,
      "humidity": 26.7,
      "unit": "percent",
      "calibrated": true
    }
  }
]
```

Field mapping notes:
- `metrics`: unknown numeric payload fields (key name is preserved).
- `extras`: unknown non-numeric payload fields (`string`, `boolean`, `null`, objects, etc.).
- `raw`: full payload copy from MQTT for traceability/debugging.
- `timestamp`: converted from `epoch_s`, serialized as ISO string in JSON responses.
- `tempC`: optional; may be absent for sensors that do not report temperature.

### `GET /api/status`

Returns an array of latest chip status objects (latest value per `mcuId`).

```json
[
  {
    "mcuMac": "e8:9f:6d:1f:b2:10",
    "mcuId": "MCU999",
    "timestamp": "2026-02-15T16:40:21.000Z",
    "ipAddress": "192.168.0.10",
    "details": {
      "firmware": "1.0.0"
    }
  }
]
```

> Note: These endpoints are currently temporary and implemented directly in `app.ts`.