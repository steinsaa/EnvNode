import { ChipStatus, SensorReading } from '../models/index.js';
import { TelemetryStore } from './telemetry.Store.js';

export interface PostgresQueryClient {
    query(text: string, params?: unknown[]): Promise<unknown>;
}

type PostgresTelemetryStoreOptions = {
    schema?: string;
    sensorTable?: string;
    statusTable?: string;
};

const IDENTIFIER_PATTERN = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

const ensureIdentifier = (value: string, label: string): string => {
    if (!IDENTIFIER_PATTERN.test(value)) {
        throw new Error(`Invalid SQL identifier for ${label}: ${value}`);
    }

    return value;
};

const asNullableString = (value: string): string | null => {
    return value.length > 0 ? value : null;
};

export class PostgresTelemetryStore implements TelemetryStore {
    private readonly schema: string;
    private readonly sensorTable: string;
    private readonly statusTable: string;

    public constructor(
        private readonly client: PostgresQueryClient,
        options: PostgresTelemetryStoreOptions = {},
    ) {
        this.schema = ensureIdentifier(options.schema ?? 'public', 'schema');
        this.sensorTable = ensureIdentifier(options.sensorTable ?? 'sensor_readings', 'sensorTable');
        this.statusTable = ensureIdentifier(options.statusTable ?? 'chip_statuses', 'statusTable');
    }

    public async initialize(): Promise<void> {
        await this.client.query(`
            CREATE TABLE IF NOT EXISTS ${this.schema}.${this.sensorTable} (
                id BIGSERIAL PRIMARY KEY,
                mcu_id TEXT NOT NULL,
                mcu_mac TEXT NULL,
                sensor_type TEXT NOT NULL,
                sensor_id TEXT NOT NULL,
                event_timestamp TIMESTAMPTZ NOT NULL,
                temp_c DOUBLE PRECISION NULL,
                metrics JSONB NOT NULL,
                extras JSONB NOT NULL,
                raw JSONB NOT NULL,
                inserted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            );
        `);

        await this.client.query(`
            CREATE TABLE IF NOT EXISTS ${this.schema}.${this.statusTable} (
                id BIGSERIAL PRIMARY KEY,
                mcu_id TEXT NOT NULL,
                mcu_mac TEXT NULL,
                event_timestamp TIMESTAMPTZ NOT NULL,
                ip_address TEXT NOT NULL,
                details JSONB NOT NULL,
                inserted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            );
        `);

        await this.client.query(`
            CREATE INDEX IF NOT EXISTS idx_${this.sensorTable}_mcu_sensor_ts
            ON ${this.schema}.${this.sensorTable} (mcu_id, sensor_id, event_timestamp DESC);
        `);

        await this.client.query(`
            CREATE INDEX IF NOT EXISTS idx_${this.statusTable}_mcu_ts
            ON ${this.schema}.${this.statusTable} (mcu_id, event_timestamp DESC);
        `);
    }

    public async saveSensorReading(reading: SensorReading): Promise<void> {
        await this.client.query(
            `
            INSERT INTO ${this.schema}.${this.sensorTable}
            (mcu_id, mcu_mac, sensor_type, sensor_id, event_timestamp, temp_c, metrics, extras, raw)
            VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8::jsonb, $9::jsonb);
            `,
            [
                reading.mcuId,
                asNullableString(reading.mcuMac),
                reading.sensorType,
                reading.sensorId,
                reading.timestamp,
                reading.tempC ?? null,
                JSON.stringify(reading.metrics),
                JSON.stringify(reading.extras),
                JSON.stringify(reading.raw),
            ],
        );
    }

    public async saveChipStatus(status: ChipStatus): Promise<void> {
        await this.client.query(
            `
            INSERT INTO ${this.schema}.${this.statusTable}
            (mcu_id, mcu_mac, event_timestamp, ip_address, details)
            VALUES ($1, $2, $3, $4, $5::jsonb);
            `,
            [
                status.mcuId,
                asNullableString(status.mcuMac),
                status.timestamp,
                status.ipAddress,
                JSON.stringify(status.details),
            ],
        );
    }
}
