import { Request, Response } from 'express';
import { getTelemetryStoreHealth } from '../repositories/telemetry.Store.js';
import { mqttIngestionService } from '../services/mqttIngestion.service.js';

export const getLatestReadings = (_req: Request, res: Response): void => {
    res.json(mqttIngestionService.getLatestSensorReadings());
};

export const getLatestStatuses = (_req: Request, res: Response): void => {
    res.json(mqttIngestionService.getLatestChipStatuses());
};

export const getDbHealth = async (_req: Request, res: Response): Promise<void> => {
    try {
        const health = await getTelemetryStoreHealth();
        res.status(health.ok ? 200 : 503).json(health);
    } catch (error) {
        const details = error instanceof Error ? error.message : 'Unknown db health error';

        res.status(503).json({
            ok: false,
            storeType: 'postgres',
            details,
        });
    }
};
