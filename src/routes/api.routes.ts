import { Router } from 'express';
import { getDbHealth, getLatestReadings, getLatestStatuses } from '../controllers/mqttIngestion.controller.js';

export const apiRouter = Router();

apiRouter.get('/', (_req, res) => {
	res.json({
		endpoints: ['/api/latest-readings', '/api/status', '/api/db-health'],
	});
});

apiRouter.get('/latest-readings', getLatestReadings);
apiRouter.get('/status', getLatestStatuses);
apiRouter.get('/db-health', getDbHealth);
