import { ChipStatus, MqttChipStatusPayload, MqttSensorPayload, SensorReading } from '../models';

type SensorTopicParts = {
    sensorType?: string;
    mcuId: string;
    sensorId: string;
};

const SENSOR_TOPIC_PREFIX = 'sensors';
const STATUS_TOPIC = 'status/running';

const toDateFromEpochSeconds = (epochSeconds: number): Date => {
    if (!Number.isFinite(epochSeconds)) {
        throw new Error('Invalid epoch_s value; expected a finite number.');
    }
    return new Date(epochSeconds * 1000);
};

export const parseSensorTopic = (topic: string): SensorTopicParts => {
    const parts = topic.split('/');
    if (parts[0] !== SENSOR_TOPIC_PREFIX) {
        throw new Error(`Invalid sensor topic: ${topic}`);
    }

    if (parts.length === 4) {
        const [, sensorType, mcuId, sensorId] = parts;
        if (!sensorType || !mcuId || !sensorId) {
            throw new Error(`Invalid sensor topic parts: ${topic}`);
        }
        return { sensorType, mcuId, sensorId };
    }

    if (parts.length === 3) {
        const [, mcuId, sensorId] = parts;
        if (!mcuId || !sensorId) {
            throw new Error(`Invalid sensor topic parts: ${topic}`);
        }
        return { mcuId, sensorId };
    }

    throw new Error(`Invalid sensor topic: ${topic}`);
};

export const parseStatusTopic = (topic: string): void => {
    if (topic !== STATUS_TOPIC) {
        throw new Error(`Invalid status topic: ${topic}`);
    }
};

export const parseSensorPayload = (payload: MqttSensorPayload, topic: string): SensorReading => {
    const { sensorType: topicSensorType, mcuId, sensorId } = parseSensorTopic(topic);

    if (!payload.MCU_id || typeof payload.epoch_s !== 'number') {
        throw new Error('Sensor payload missing required fields');
    }

    const sensorType = payload.sensor_type ?? topicSensorType;
    if (!sensorType) {
        throw new Error('Sensor payload missing sensor_type');
    }

    const metrics: Record<string, number> = {};
    const ignoredKeys = new Set([
        'MCU_id',
        'MCU_mac',
        'sensor_type',
        'sensor_id',
        'epoch_s',
        'temp_c',
    ]);

    Object.entries(payload).forEach(([key, value]) => {
        if (ignoredKeys.has(key)) return;
        if (typeof value === 'number') {
            metrics[key] = value;
        }
    });

    return {
        mcuMac: payload.MCU_mac ?? '',
        mcuId: payload.MCU_id,
        timestamp: toDateFromEpochSeconds(payload.epoch_s),
        sensorType,
        sensorId,
        tempC: typeof payload.temp_c === 'number' ? payload.temp_c : undefined,
        metrics,
        raw: { ...payload },
    };
};

export const parseChipStatusPayload = (payload: MqttChipStatusPayload, topic: string): ChipStatus => {
    parseStatusTopic(topic);

    const ipAddress = payload.ip_address;
    const mcuMac = payload.MCU_mac;

    if (!payload.MCU_id || typeof payload.epoch_s !== 'number' || !ipAddress) {
        throw new Error('Chip status payload missing required fields');
    }

    const { MCU_id, epoch_s, ip_address, ...rest } = payload;

    return {
        mcuMac: mcuMac ?? '',
        mcuId: MCU_id,
        timestamp: toDateFromEpochSeconds(epoch_s),
        ipAddress,
        details: { ...rest },
    };
};
