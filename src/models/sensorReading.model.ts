export interface MqttSensorPayload {
    MCU_id: string;
    epoch_s: number;
    temp_c?: number;
    [key: string]: unknown;
}

export interface SensorReading {
    mcuId: string;
    timestamp: Date;
    sensorType: string;
    sensorId: string;
    tempC?: number;
    metrics: Record<string, number>;
    raw: Record<string, unknown>;
}
