import { describe, expect, it, vi } from 'vitest';
import { PostgresTelemetryStore, PostgresQueryClient } from '../repositories/PostgresTelemetryStore.js';

describe('PostgresTelemetryStore', () => {
    it('maps sensor reading values into an insert query', async () => {
        const client: PostgresQueryClient = {
            query: vi.fn().mockResolvedValue(undefined),
        };

        const store = new PostgresTelemetryStore(client);

        await store.saveSensorReading({
            mcuMac: 'e0:e2:e6:9d:0f:04',
            mcuId: 'test3',
            sensorType: 'dht22',
            sensorId: 'dht22',
            timestamp: new Date('2026-02-15T16:40:20.000Z'),
            tempC: 27.6,
            metrics: { humidity: 26.7 },
            extras: { unit: 'percent' },
            raw: {
                MCU_id: 'test3',
                epoch_s: 1_771_170_020,
                humidity: 26.7,
            },
        });

        expect(client.query).toHaveBeenCalledTimes(1);

        const [queryText, queryParams] = vi.mocked(client.query).mock.calls[0] ?? [];
        expect(String(queryText)).toContain('INSERT INTO public.sensor_readings');
        expect(queryParams).toEqual([
            'test3',
            'e0:e2:e6:9d:0f:04',
            'dht22',
            'dht22',
            new Date('2026-02-15T16:40:20.000Z'),
            27.6,
            '{"humidity":26.7}',
            '{"unit":"percent"}',
            '{"MCU_id":"test3","epoch_s":1771170020,"humidity":26.7}',
        ]);
    });

    it('maps chip status values into an insert query', async () => {
        const client: PostgresQueryClient = {
            query: vi.fn().mockResolvedValue(undefined),
        };

        const store = new PostgresTelemetryStore(client, { schema: 'public' });

        await store.saveChipStatus({
            mcuMac: 'e8:9f:6d:1f:b2:10',
            mcuId: 'MCU999',
            timestamp: new Date('2026-02-15T16:40:21.000Z'),
            ipAddress: '192.168.0.10',
            details: { firmware: '1.0.0' },
        });

        expect(client.query).toHaveBeenCalledTimes(1);

        const [queryText, queryParams] = vi.mocked(client.query).mock.calls[0] ?? [];
        expect(String(queryText)).toContain('INSERT INTO public.chip_statuses');
        expect(queryParams).toEqual([
            'MCU999',
            'e8:9f:6d:1f:b2:10',
            new Date('2026-02-15T16:40:21.000Z'),
            '192.168.0.10',
            '{"firmware":"1.0.0"}',
        ]);
    });

    it('rejects invalid sql identifiers in options', () => {
        const client: PostgresQueryClient = {
            query: vi.fn().mockResolvedValue(undefined),
        };

        expect(() => {
            new PostgresTelemetryStore(client, { schema: 'public;DROP_TABLE' });
        }).toThrow('Invalid SQL identifier for schema: public;DROP_TABLE');
    });
});
