import { Request, Response } from 'express';
import { mqttIngestionService } from '../services/mqttIngestion.service.js';

export const getLatestReadings = (_req: Request, res: Response): void => {
    res.json(mqttIngestionService.getLatestSensorReadings());
};

export const getLatestStatuses = (_req: Request, res: Response): void => {
    res.json(mqttIngestionService.getLatestChipStatuses());
};
