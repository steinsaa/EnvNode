import { afterEach, describe, expect, it, vi } from 'vitest';
import { mqttRepository } from '../repositories/mqtt.Repository.js';
import { TelemetryStore } from '../repositories/telemetry.Store.js';
import { MqttIngestionService } from '../services/mqttIngestion.service.js';

describe('MqttIngestionService storage integration', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('persists parsed sensor and status messages via TelemetryStore', async () => {
        const store: TelemetryStore = {
            saveSensorReading: vi.fn().mockResolvedValue(undefined),
            saveChipStatus: vi.fn().mockResolvedValue(undefined),
        };

        const service = new MqttIngestionService(store);

        let messageHandler: ((topic: string, message: Buffer) => void) | undefined;

        vi.spyOn(mqttRepository, 'connect').mockResolvedValue(undefined);
        vi.spyOn(mqttRepository, 'subscribe').mockImplementation(() => undefined);
        vi.spyOn(mqttRepository, 'addMessageHandler').mockImplementation((handler) => {
            messageHandler = handler;
        });
        vi.spyOn(mqttRepository, 'removeMessageHandler').mockImplementation(() => undefined);
        vi.spyOn(mqttRepository, 'disconnect').mockResolvedValue(undefined);

        await service.start();

        expect(messageHandler).toBeDefined();

        messageHandler?.(
            'sensors/test3/dht22',
            Buffer.from(JSON.stringify({
                MCU_mac: 'e0:e2:e6:9d:0f:04',
                MCU_id: 'test3',
                sensor_type: 'dht22',
                epoch_s: 1_771_170_020,
                temp_c: 27.6,
                humidity: 26.7,
            })),
        );

        messageHandler?.(
            'status/running',
            Buffer.from(JSON.stringify({
                MCU_mac: 'e8:9f:6d:1f:b2:10',
                MCU_id: 'MCU999',
                epoch_s: 1_700_000_001,
                ip_address: '192.168.0.10',
                firmware: '1.0.0',
            })),
        );

        expect(store.saveSensorReading).toHaveBeenCalledTimes(1);
        expect(store.saveChipStatus).toHaveBeenCalledTimes(1);

        await service.stop();
    });
});
