import express from 'express';
import { AddressInfo } from 'node:net';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../app.js';
import { apiRouter } from '../routes/api.routes.js';
import { mqttIngestionService } from '../services/mqttIngestion.service.js';

const createTestServer = async () => {
    const app = express();
    app.use('/api', apiRouter);

    const server = await new Promise<ReturnType<typeof app.listen>>((resolve) => {
        const startedServer = app.listen(0, () => resolve(startedServer));
    });

    return server;
};

const createAppSurfaceTestServer = async () => {
    const app = createApp();

    const server = await new Promise<ReturnType<typeof app.listen>>((resolve) => {
        const startedServer = app.listen(0, () => resolve(startedServer));
    });

    return server;
};

describe('api.routes', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('returns latest readings from ingestion service', async () => {
        vi.spyOn(mqttIngestionService, 'getLatestSensorReadings').mockReturnValue([
            {
                mcuMac: 'e0:e2:e6:9d:0f:04',
                mcuId: 'test3',
                sensorType: 'dht22',
                sensorId: 'dht22',
                timestamp: new Date('2026-02-15T16:40:20.000Z'),
                tempC: 27.6,
                metrics: { humidity: 26.7 },
                extras: { calibrated: true },
                raw: {
                    MCU_mac: 'e0:e2:e6:9d:0f:04',
                    MCU_id: 'test3',
                    sensor_type: 'dht22',
                    epoch_s: 1_771_170_020,
                    temp_c: 27.6,
                    humidity: 26.7,
                    calibrated: true,
                },
            },
        ]);

        const server = await createTestServer();
        const port = (server.address() as AddressInfo).port;

        try {
            const response = await fetch(`http://127.0.0.1:${port}/api/latest-readings`);
            const body = await response.json() as Array<Record<string, unknown>>;

            expect(response.status).toBe(200);
            expect(body).toHaveLength(1);
            expect(body[0]?.mcuId).toBe('test3');
            expect(body[0]?.sensorType).toBe('dht22');
            expect(body[0]?.metrics).toEqual({ humidity: 26.7 });
            expect(body[0]?.extras).toEqual({ calibrated: true });
            expect(body[0]?.timestamp).toBe('2026-02-15T16:40:20.000Z');
        } finally {
            await new Promise<void>((resolve, reject) => {
                server.close((error) => (error ? reject(error) : resolve()));
            });
        }
    });

    it('returns API endpoint listing on /api', async () => {
        const server = await createTestServer();
        const port = (server.address() as AddressInfo).port;

        try {
            const response = await fetch(`http://127.0.0.1:${port}/api`);
            const body = await response.json() as { endpoints: string[] };

            expect(response.status).toBe(200);
            expect(body.endpoints).toEqual(['/api/latest-readings', '/api/status']);
        } finally {
            await new Promise<void>((resolve, reject) => {
                server.close((error) => (error ? reject(error) : resolve()));
            });
        }
    });

    it('returns latest statuses from ingestion service', async () => {
        vi.spyOn(mqttIngestionService, 'getLatestChipStatuses').mockReturnValue([
            {
                mcuMac: 'e8:9f:6d:1f:b2:10',
                mcuId: 'MCU999',
                timestamp: new Date('2026-02-15T16:40:21.000Z'),
                ipAddress: '192.168.0.10',
                details: { firmware: '1.0.0' },
            },
        ]);

        const server = await createTestServer();
        const port = (server.address() as AddressInfo).port;

        try {
            const response = await fetch(`http://127.0.0.1:${port}/api/status`);
            const body = await response.json() as Array<Record<string, unknown>>;

            expect(response.status).toBe(200);
            expect(body).toHaveLength(1);
            expect(body[0]?.mcuId).toBe('MCU999');
            expect(body[0]?.ipAddress).toBe('192.168.0.10');
            expect(body[0]?.details).toEqual({ firmware: '1.0.0' });
            expect(body[0]?.timestamp).toBe('2026-02-15T16:40:21.000Z');
        } finally {
            await new Promise<void>((resolve, reject) => {
                server.close((error) => (error ? reject(error) : resolve()));
            });
        }
    });

    it('returns 404 for unknown /api routes', async () => {
        const server = await createTestServer();
        const port = (server.address() as AddressInfo).port;

        try {
            const response = await fetch(`http://127.0.0.1:${port}/api/unknown-route`);

            expect(response.status).toBe(404);
        } finally {
            await new Promise<void>((resolve, reject) => {
                server.close((error) => (error ? reject(error) : resolve()));
            });
        }
    });

    it('returns expected responses for /health and /api', async () => {
        const server = await createAppSurfaceTestServer();
        const port = (server.address() as AddressInfo).port;

        try {
            const healthResponse = await fetch(`http://127.0.0.1:${port}/health`);
            const healthBody = await healthResponse.json() as { status: string };

            expect(healthResponse.status).toBe(200);
            expect(healthBody).toEqual({ status: 'ok' });

            const apiResponse = await fetch(`http://127.0.0.1:${port}/api`);
            const apiBody = await apiResponse.json() as { endpoints: string[] };

            expect(apiResponse.status).toBe(200);
            expect(apiBody.endpoints).toEqual(['/api/latest-readings', '/api/status']);
        } finally {
            await new Promise<void>((resolve, reject) => {
                server.close((error) => (error ? reject(error) : resolve()));
            });
        }
    });
});
