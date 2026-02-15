import { Router } from 'express';
import { getLatestReadings, getLatestStatuses } from '../controllers/mqttIngestion.controller.js';

export const apiRouter = Router();

apiRouter.get('/', (_req, res) => {
	res.json({
		endpoints: ['/api/latest-readings', '/api/status'],
	});
});

apiRouter.get('/latest-readings', getLatestReadings);
apiRouter.get('/status', getLatestStatuses);
