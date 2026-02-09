export interface MqttSensorPayload {
    MCU_mac?: string;
    MCU_id: string;
    sensor_type?: string;
    sensor_id?: string;
    epoch_s: number;
    temp_c?: number | null;
    [key: string]: unknown;
}

export interface SensorReading {
    mcuMac: string;
    mcuId: string;
    sensorType: string;
    sensorId: string;
    timestamp: Date;
    tempC?: number;
    metrics: Record<string, number>;
    raw: Record<string, unknown>;
}
