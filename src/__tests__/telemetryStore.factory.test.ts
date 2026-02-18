import { afterEach, describe, expect, it, vi } from 'vitest';
import { PostgresTelemetryStore } from '../repositories/PostgresTelemetryStore.js';
import {
    createPostgresPoolConfigFromEnv,
    createTelemetryStore,
    initializeTelemetryStore,
    NoopTelemetryStore,
} from '../repositories/telemetry.Store.js';

const originalEnv = { ...process.env };

describe('telemetry store factory', () => {
    afterEach(() => {
        process.env = { ...originalEnv };
    });

    it('uses NoopTelemetryStore by default', () => {
        delete process.env.TELEMETRY_STORE;

        const store = createTelemetryStore();

        expect(store).toBeInstanceOf(NoopTelemetryStore);
    });

    it('creates PostgresTelemetryStore when TELEMETRY_STORE=postgres', () => {
        process.env.TELEMETRY_STORE = 'postgres';
        process.env.PGHOST = '10.0.0.5';
        process.env.PGPORT = '5432';
        process.env.PGUSER = 'envnode';
        process.env.PGPASSWORD = 'secret';
        process.env.PGDATABASE = 'timescaledb';

        const store = createTelemetryStore();

        expect(store).toBeInstanceOf(PostgresTelemetryStore);
    });

    it('throws when postgres store is selected but required env is missing', () => {
        process.env.TELEMETRY_STORE = 'postgres';
        delete process.env.PGHOST;
        process.env.PGUSER = 'envnode';
        process.env.PGPASSWORD = 'secret';
        process.env.PGDATABASE = 'timescaledb';

        expect(() => createTelemetryStore()).toThrow('Missing required environment variable: PGHOST');
    });

    it('builds pool config from env values', () => {
        process.env.PGHOST = 'db.example.local';
        process.env.PGPORT = '6432';
        process.env.PGUSER = 'envnode';
        process.env.PGPASSWORD = 'secret';
        process.env.PGDATABASE = 'timescaledb';
        process.env.PGPOOL_MAX = '15';
        process.env.PGSSL = 'true';

        const config = createPostgresPoolConfigFromEnv();

        expect(config.host).toBe('db.example.local');
        expect(config.port).toBe(6432);
        expect(config.user).toBe('envnode');
        expect(config.password).toBe('secret');
        expect(config.database).toBe('timescaledb');
        expect(config.max).toBe(15);
        expect(config.ssl).toEqual({ rejectUnauthorized: false });
    });

    it('initializes store when initialize is implemented', async () => {
        const initialize = vi.fn().mockResolvedValue(undefined);
        const store = {
            saveSensorReading: vi.fn().mockResolvedValue(undefined),
            saveChipStatus: vi.fn().mockResolvedValue(undefined),
            initialize,
        };

        await initializeTelemetryStore(store);

        expect(initialize).toHaveBeenCalledTimes(1);
    });

    it('does nothing when store has no initialize method', async () => {
        const store = new NoopTelemetryStore();

        await expect(initializeTelemetryStore(store)).resolves.toBeUndefined();
    });
});
