import { ChipStatus, SensorReading } from '../models/index.js';
import { Pool, PoolConfig } from 'pg';
import { PostgresTelemetryStore } from './PostgresTelemetryStore.js';

export interface TelemetryStore {
    saveSensorReading(reading: SensorReading): Promise<void>;
    saveChipStatus(status: ChipStatus): Promise<void>;
}

export interface InitializableTelemetryStore extends TelemetryStore {
    initialize(): Promise<void>;
}

export class NoopTelemetryStore implements TelemetryStore {
    public async saveSensorReading(_reading: SensorReading): Promise<void> {
        return;
    }

    public async saveChipStatus(_status: ChipStatus): Promise<void> {
        return;
    }
}

const toInt = (value: string | undefined, fallback: number): number => {
    if (!value) return fallback;

    const parsed = Number.parseInt(value, 10);
    return Number.isNaN(parsed) ? fallback : parsed;
};

const getRequiredEnv = (key: string): string => {
    const value = process.env[key];
    if (!value || value.trim().length === 0) {
        throw new Error(`Missing required environment variable: ${key}`);
    }
    return value;
};

export const createPostgresPoolConfigFromEnv = (): PoolConfig => {
    return {
        host: getRequiredEnv('PGHOST'),
        port: toInt(process.env.PGPORT, 5432),
        user: getRequiredEnv('PGUSER'),
        password: getRequiredEnv('PGPASSWORD'),
        database: getRequiredEnv('PGDATABASE'),
        max: toInt(process.env.PGPOOL_MAX, 10),
        ssl: process.env.PGSSL === 'true' ? { rejectUnauthorized: false } : undefined,
    };
};

export const createTelemetryStore = (): TelemetryStore => {
    const storeType = process.env.TELEMETRY_STORE ?? 'noop';

    if (storeType === 'postgres') {
        const pool = new Pool(createPostgresPoolConfigFromEnv());
        return new PostgresTelemetryStore(pool, {
            schema: process.env.POSTGRES_SCHEMA,
            sensorTable: process.env.POSTGRES_SENSOR_TABLE,
            statusTable: process.env.POSTGRES_STATUS_TABLE,
        });
    }

    return new NoopTelemetryStore();
};

export const telemetryStore: TelemetryStore = createTelemetryStore();

const isInitializableTelemetryStore = (store: TelemetryStore): store is InitializableTelemetryStore => {
    return typeof (store as Partial<InitializableTelemetryStore>).initialize === 'function';
};

export const initializeTelemetryStore = async (store: TelemetryStore = telemetryStore): Promise<void> => {
    if (isInitializableTelemetryStore(store)) {
        await store.initialize();
    }
};

export const getTelemetryStoreType = (store: TelemetryStore = telemetryStore): string => {
    if (store instanceof PostgresTelemetryStore) {
        return 'postgres';
    }

    if (store instanceof NoopTelemetryStore) {
        return 'noop';
    }

    return store.constructor.name;
};
