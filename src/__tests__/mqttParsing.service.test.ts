import { describe, expect, it } from 'vitest';
import {
    parseChipStatusPayload,
    parseSensorPayload,
    parseSensorTopic,
    parseStatusTopic,
} from '../services/mqttParsing.service.js';

describe('mqttParsing.service', () => {
    it('parses sensor topic parts', () => {
        const parts = parseSensorTopic('sensors/MCU123/NTC');
        expect(parts).toEqual({ mcuId: 'MCU123', sensorId: 'NTC' });
    });

    it('parses sensor payload into domain model', () => {
        const payload = {
            MCU_mac: 'e0:e2:e6:9d:0f:04',
            MCU_id: 'MCU123',
            epoch_s: 1_700_000_000,
            sensor_type: 'ntc',
            temp_c: 21.5,
            humidity: 45.2,
        };

        const reading = parseSensorPayload(payload, 'sensors/MCU123/NTC');

        expect(reading.mcuMac).toBe('e0:e2:e6:9d:0f:04');
        expect(reading.mcuId).toBe('MCU123');
        expect(reading.sensorType).toBe('ntc');
        expect(reading.sensorId).toBe('NTC');
        expect(reading.tempC).toBe(21.5);
        expect(reading.metrics.humidity).toBe(45.2);
        expect(reading.timestamp).toBeInstanceOf(Date);
    });

    it('accepts status topic and maps payload', () => {
        parseStatusTopic('status/running');

        const payload = {
            MCU_mac: 'e8:9f:6d:1f:b2:10',
            MCU_id: 'MCU999',
            epoch_s: 1_700_000_001,
            ip_address: '192.168.0.10',
            firmware: '1.0.0',
        };

        const status = parseChipStatusPayload(payload, 'status/running');

        expect(status.mcuMac).toBe('e8:9f:6d:1f:b2:10');
        expect(status.mcuId).toBe('MCU999');
        expect(status.ipAddress).toBe('192.168.0.10');
        expect(status.details.firmware).toBe('1.0.0');
        expect(status.timestamp).toBeInstanceOf(Date);
    });

});
