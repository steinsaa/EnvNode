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

    it('accepts payload shape with humidity metric from user example', () => {
        const payload = {
            MCU_mac: 'e0:e2:e6:9d:0f:04',
            MCU_id: 'test3',
            sensor_type: 'dht22',
            epoch_s: 1_771_170_020,
            temp_c: 27.6,
            humidity: 26.7,
        };

        const reading = parseSensorPayload(payload, 'sensors/test3/dht22');

        expect(reading.mcuMac).toBe('e0:e2:e6:9d:0f:04');
        expect(reading.mcuId).toBe('test3');
        expect(reading.sensorType).toBe('dht22');
        expect(reading.sensorId).toBe('dht22');
        expect(reading.tempC).toBe(27.6);
        expect(reading.metrics.humidity).toBe(26.7);
    });

    it('parses non-temperature sensors when temp_c is missing', () => {
        const payload = {
            MCU_id: 'MCU_NO_TEMP',
            sensor_type: 'co2',
            epoch_s: 1_700_000_100,
            ppm: 612,
        };

        const reading = parseSensorPayload(payload, 'sensors/MCU_NO_TEMP/CO2_1');

        expect(reading.tempC).toBeUndefined();
        expect(reading.metrics.ppm).toBe(612);
        expect(reading.sensorId).toBe('CO2_1');
        expect(reading.sensorType).toBe('co2');
    });

    it('maps non-numeric unknown payload fields to extras', () => {
        const payload = {
            MCU_id: 'MCU_META',
            sensor_type: 'env',
            epoch_s: 1_700_000_200,
            humidity: 41.2,
            unit: 'percent',
            calibrated: true,
            note: null,
        };

        const reading = parseSensorPayload(payload, 'sensors/MCU_META/ENV_1');

        expect(reading.metrics.humidity).toBe(41.2);
        expect(reading.extras.unit).toBe('percent');
        expect(reading.extras.calibrated).toBe(true);
        expect(reading.extras.note).toBeNull();
        expect(reading.metrics.unit).toBeUndefined();
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
