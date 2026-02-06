import { EventEmitter } from 'node:events';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import * as mqtt from 'mqtt';
import { getMqttConfig } from '../config/mqtt.config';
import { MqttRepository, mqttRepository } from '../repositories/mqtt.Repository';

vi.mock('mqtt', () => ({
    connect: vi.fn(),
}));

vi.mock('../config/mqtt.config', () => ({
    getMqttConfig: vi.fn(),
}));

type MockClient = EventEmitter & {
    connected: boolean;
    subscribe: (topic: string, cb: (err?: Error) => void) => void;
    publish: (topic: string, message: string | Buffer, cb: (err?: Error) => void) => void;
    end: (force: boolean, opts: Record<string, unknown>, cb?: () => void) => void;
    reconnect: () => void;
};

const createMockClient = (): MockClient => {
    const client = new EventEmitter() as MockClient;
    client.connected = false;
    client.subscribe = (_topic, cb) => cb();
    client.publish = (_topic, _message, cb) => cb();
    client.end = (_force, _opts, cb) => {
        client.connected = false;
        cb?.();
    };
    client.reconnect = () => {
        client.connected = true;
        client.emit('connect');
    };
    return client;
};

const mockRuntimeConfig = {
    clientOptions: {
        host: 'localhost',
        port: 1883,
        protocol: 'mqtt',
        clientId: 'envnode_test',
        username: 'user',
        password: 'pass',
    },
    retry: {
        initialMs: 1000,
        maxMs: 30000,
        factor: 2,
    },
};

describe('MqttRepository usage patterns', () => {
    beforeEach(async () => {
        vi.mocked(getMqttConfig).mockReturnValue(mockRuntimeConfig);
        vi.mocked(mqtt.connect).mockReset();
        await mqttRepository.disconnect();
    });

    afterEach(async () => {
        await mqttRepository.disconnect();
    });

    it('class instance: connect uses a fresh repository', async () => {
        const client = createMockClient();
        vi.mocked(mqtt.connect).mockImplementation(() => {
            setImmediate(() => {
                client.connected = true;
                client.emit('connect');
            });
            return client as unknown as mqtt.MqttClient;
        });

        const repo = new MqttRepository();
        await repo.connect();

        expect(mqtt.connect).toHaveBeenCalledTimes(1);
        expect(mqtt.connect).toHaveBeenCalledWith(mockRuntimeConfig.clientOptions);
        await repo.disconnect();
    });

    it('singleton: mqttRepository shares the same instance', async () => {
        const client = createMockClient();
        vi.mocked(mqtt.connect).mockImplementation(() => {
            setImmediate(() => {
                client.connected = true;
                client.emit('connect');
            });
            return client as unknown as mqtt.MqttClient;
        });

        await mqttRepository.connect();

        expect(mqtt.connect).toHaveBeenCalledTimes(1);
        expect(mqtt.connect).toHaveBeenCalledWith(mockRuntimeConfig.clientOptions);
    });
});
