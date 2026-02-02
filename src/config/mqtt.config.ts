// src/config/mqtt.config.ts

import { IClientOptions } from 'mqtt';
import { randomUUID } from 'node:crypto';

export interface MqttRetryConfig {
    initialMs: number;
    maxMs: number;
    factor: number;
}

export interface MqttRuntimeConfig {
    clientOptions: IClientOptions;
    retry: MqttRetryConfig;
}

const DEFAULT_PROTOCOL: IClientOptions['protocol'] = 'mqtt';

const toInt = (value: string | undefined, fallback: number): number => {
    if (!value) return fallback;
    const parsed = Number.parseInt(value, 10);
    return Number.isNaN(parsed) ? fallback : parsed;
};

const toFloat = (value: string | undefined, fallback: number): number => {
    if (!value) return fallback;
    const parsed = Number.parseFloat(value);
    return Number.isNaN(parsed) ? fallback : parsed;
};

const getRetryConfig = (): MqttRetryConfig => {
    const initialMs = toInt(process.env.MQTT_RECONNECT_INITIAL_MS, 1000);
    const maxMs = toInt(process.env.MQTT_RECONNECT_MAX_MS, 30000);
    const factor = toFloat(process.env.MQTT_RECONNECT_FACTOR, 2);

    if (initialMs <= 0 || maxMs <= 0 || factor < 1) {
        throw new Error('Invalid MQTT reconnect settings. Ensure positive delays and factor >= 1.');
    }

    if (maxMs < initialMs) {
        throw new Error('MQTT_RECONNECT_MAX_MS must be >= MQTT_RECONNECT_INITIAL_MS.');
    }

    return { initialMs, maxMs, factor };
};

/**
 * Get MQTT client configuration with environment variables
 * @returns MQTT client options and retry settings
 */
export function getMqttConfig(): MqttRuntimeConfig {
    const requiredVars = ['MQTT_HOST', 'MQTT_USERNAME', 'MQTT_PASSWORD'];
    const missingVars = requiredVars.filter(varName => !process.env[varName]);

    if (missingVars.length > 0) {
        throw new Error(`Missing required MQTT environment variables: ${missingVars.join(', ')}`);
    }

    const port = toInt(process.env.MQTT_PORT, 1883);
    if (port <= 0) {
        throw new Error('Invalid MQTT_PORT. Must be a positive integer.');
    }

    const protocol = (process.env.MQTT_PROTOCOL as IClientOptions['protocol']) || DEFAULT_PROTOCOL;

    const clientOptions: IClientOptions = {
        host: process.env.MQTT_HOST,
        port,
        protocol,
        clientId: `envnode_${randomUUID()}`,
        username: process.env.MQTT_USERNAME,
        password: process.env.MQTT_PASSWORD,
        clean: true,
        connectTimeout: 30_000,
        keepalive: 60,
        reconnectPeriod: 0,
        resubscribe: true,
    };

    return {
        clientOptions,
        retry: getRetryConfig(),
    };
}
