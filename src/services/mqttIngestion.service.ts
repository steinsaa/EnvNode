import pino from 'pino';
import { ChipStatus, SensorReading } from '../models/index.js';
import { mqttRepository } from '../repositories/mqtt.Repository.js';
import { telemetryStore, TelemetryStore } from '../repositories/telemetry.Store.js';
import { parseChipStatusPayload, parseSensorPayload } from './mqttParsing.service.js';

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

type LatestSensorKey = `${string}:${string}`;

type MessageHandler = (topic: string, message: Buffer) => void;

export class MqttIngestionService {
    private isStarted = false;
    private readonly latestSensorReadings = new Map<LatestSensorKey, SensorReading>();
    private readonly latestChipStatuses = new Map<string, ChipStatus>();
    private messageHandler: MessageHandler | null = null;

    public constructor(private readonly store: TelemetryStore = telemetryStore) {}

    public async start(): Promise<void> {
        if (this.isStarted) {
            logger.info('MQTT ingestion already started');
            return;
        }

        await mqttRepository.connect();

        this.messageHandler = (topic, message) => {
            const payloadText = message.toString('utf8');
            try {
                const payload = JSON.parse(payloadText) as Record<string, unknown>;

                if (topic.startsWith('sensors/')) {
                    const reading = parseSensorPayload(payload as never, topic);
                    void this.store.saveSensorReading(reading).catch((error) => {
                        logger.error({ error, topic }, 'Failed to persist sensor reading');
                    });
                    const key: LatestSensorKey = `${reading.mcuId}:${reading.sensorId}`;
                    this.latestSensorReadings.set(key, reading);
                    logger.info({
                        topic,
                        mcuId: reading.mcuId,
                        sensorId: reading.sensorId,
                        sensorType: reading.sensorType,
                    }, 'Sensor reading ingested');
                    return;
                }

                if (topic === 'status/running') {
                    const status = parseChipStatusPayload(payload as never, topic);
                    void this.store.saveChipStatus(status).catch((error) => {
                        logger.error({ error, topic }, 'Failed to persist chip status');
                    });
                    this.latestChipStatuses.set(status.mcuId, status);
                    logger.info({
                        topic,
                        mcuId: status.mcuId,
                        ipAddress: status.ipAddress,
                    }, 'Chip status ingested');
                    return;
                }

                logger.warn({ topic }, 'MQTT message ignored (unknown topic)');
            } catch (error) {
                const err = error instanceof Error ? { message: error.message, stack: error.stack } : error;
                logger.error({ err, topic, payloadText }, 'Failed to process MQTT message');
            }
        };

        mqttRepository.addMessageHandler(this.messageHandler);
        mqttRepository.subscribe('sensors/#');
        mqttRepository.subscribe('status/running');

        this.isStarted = true;
        logger.info('MQTT ingestion started');
    }

    public async stop(): Promise<void> {
        if (!this.isStarted) return;

        if (this.messageHandler) {
            mqttRepository.removeMessageHandler(this.messageHandler);
            this.messageHandler = null;
        }

        await mqttRepository.disconnect();
        this.isStarted = false;
        logger.info('MQTT ingestion stopped');
    }

    public getLatestSensorReadings(): SensorReading[] {
        return [...this.latestSensorReadings.values()];
    }

    public getLatestChipStatuses(): ChipStatus[] {
        return [...this.latestChipStatuses.values()];
    }
}

export const mqttIngestionService = new MqttIngestionService();

export const startMqttIngestion = async (): Promise<void> => {
    await mqttIngestionService.start();
};

export const stopMqttIngestion = async (): Promise<void> => {
    await mqttIngestionService.stop();
};
