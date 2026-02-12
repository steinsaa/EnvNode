// repositories/mqtt.repository.ts

import * as mqtt from 'mqtt';
import pino from 'pino';
import { getMqttConfig, MqttRetryConfig, MqttRuntimeConfig } from '../config/mqtt.config.js';

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

type MessageHandler = (topic: string, message: Buffer) => void;

export class MqttRepository {
    private client: mqtt.MqttClient | null = null;
    private messageHandlers: Set<MessageHandler> = new Set();
    private subscribedTopics: Set<string> = new Set();
    private reconnectTimer: NodeJS.Timeout | null = null;
    private reconnectDelayMs: number | null = null;
    private retryConfig: MqttRetryConfig | null = null;
    private clientOptions: mqtt.IClientOptions | null = null;
    private isConnecting = false;
    private isStopping = false;

    /**
         * Connect to the MQTT broker
         */
    public async connect(): Promise<void> {
        if (this.client?.connected) {
            logger.info('Already connected to MQTT broker');
            return;
        }

        if (this.isConnecting) {
            logger.info('MQTT connection already in progress');
            return;
        }

        try {
            this.isStopping = false;
            this.isConnecting = true;

            const config = this.ensureConfig();
            this.client = mqtt.connect(config.clientOptions) as mqtt.MqttClient;

            await this.setupEventHandlers();

            logger.info({
                host: config.clientOptions.host,
                port: config.clientOptions.port,
                protocol: config.clientOptions.protocol,
            }, 'MQTT client initialized');
        } catch (error) {
            this.isConnecting = false;
            logger.error({ error }, 'Failed to initialize MQTT client');
            throw error;
        }
    }

    /**
     * Disconnect from the MQTT broker
     */
    public async disconnect(): Promise<void> {
        this.isStopping = true;
        this.isConnecting = false;
        this.clearReconnectTimer();

        if (!this.client) return;

        return new Promise<void>((resolve) => {
            this.client?.end(false, {}, () => {
                logger.info('Disconnected from MQTT broker');
                this.client = null;
                resolve();
            });
        });
    }

     /**
     * Subscribe to a topic
     * @param topic Topic to subscribe to
     * @param handler Optional message handler for this specific topic
     */
    public subscribe(topic: string, handler?: MessageHandler): void {
        if (handler) {
            this.messageHandlers.add(handler);
            logger.debug({ topic }, 'subscribe: added handler');
        }

        this.subscribedTopics.add(topic);

        if (!this.client?.connected) {
            logger.warn({ topic }, 'MQTT client not connected. Subscription queued.');
            return;
        }

        this.client.subscribe(topic, (err) => {
            if (err) {
                logger.error({ err, topic }, 'Failed to subscribe to topic');
                return;
            }
            logger.info({ topic }, 'Subscribed to topic');
        });
    }

    /**
     * Publish a message to a topic
     */
    public publish(topic: string, message: string | Buffer): void {
        if (!this.client?.connected) {
            throw new Error('MQTT client is not connected');
        }

        this.client.publish(topic, message, (err) => {
            if (err) {
                logger.error({ err, topic }, 'Failed to publish to topic');
            }
        });
    }

     /**
     * Add a message handler
     */
    public addMessageHandler(handler: MessageHandler): void {
        this.messageHandlers.add(handler);
        logger.debug('Added message handler');
    }

     /**
     * Remove a message handler
     */
    public removeMessageHandler(handler: MessageHandler): void {
        this.messageHandlers.delete(handler);
    }

    private setupEventHandlers(): Promise<void> {
        if (!this.client) {
            throw new Error('MQTT client not initialized');
        }

        return new Promise((resolve) => {
            this.client!.on('connect', () => {
                this.isConnecting = false;
                this.resetReconnectDelay();
                this.resubscribeAll();
                logger.info('Connected to MQTT broker');
                resolve();
            });

            this.client!.on('error', (error) => {
                logger.error({ error }, 'MQTT connection error');
            });

            this.client!.on('message', (topic, message) => {
                this.messageHandlers.forEach(handler => {
                    try {
                        handler(topic, message);
                    } catch (error) {
                        logger.error({ error, topic }, 'Error in message handler');
                    }
                });
            });

            this.client!.on('close', () => {
                this.isConnecting = false;
                logger.warn('MQTT connection closed');
                this.scheduleReconnect();
            });

            this.client!.on('offline', () => {
                this.isConnecting = false;
                logger.warn('MQTT client offline');
                this.scheduleReconnect();
            });

            this.client!.on('reconnect', () => {
                logger.info('MQTT reconnect attempt triggered');
            });
        });
    }

    private ensureConfig(): MqttRuntimeConfig {
        if (!this.clientOptions || !this.retryConfig) {
            const config = getMqttConfig();
            this.clientOptions = config.clientOptions;
            this.retryConfig = config.retry;
        }

        return {
            clientOptions: this.clientOptions,
            retry: this.retryConfig,
        };
    }

    private scheduleReconnect(): void {
        if (this.isStopping || !this.client || this.client.connected) {
            return;
        }

        if (!this.retryConfig) {
            logger.warn('MQTT retry config unavailable; reconnect skipped');
            return;
        }

        if (this.reconnectTimer) {
            return;
        }

        const delay = this.reconnectDelayMs ?? this.retryConfig.initialMs;
        const nextDelay = Math.min(this.retryConfig.maxMs, Math.round(delay * this.retryConfig.factor));
        this.reconnectDelayMs = nextDelay;

        logger.warn({ delay }, 'Scheduling MQTT reconnect');
        this.reconnectTimer = setTimeout(() => {
            this.reconnectTimer = null;
            if (this.client && !this.client.connected) {
                logger.info('Attempting MQTT reconnect');
                this.client.reconnect();
            }
        }, delay);
    }

    private resetReconnectDelay(): void {
        this.reconnectDelayMs = null;
        this.clearReconnectTimer();
    }

    private clearReconnectTimer(): void {
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
    }

    private resubscribeAll(): void {
        if (!this.client?.connected || this.subscribedTopics.size === 0) {
            return;
        }

        this.subscribedTopics.forEach(topic => {
            this.client?.subscribe(topic, (err) => {
                if (err) {
                    logger.error({ err, topic }, 'Failed to resubscribe to topic');
                    return;
                }
                logger.info({ topic }, 'Resubscribed to topic');
            });
        });
    }
}  /// end class MqttRepository

export const mqttRepository = new MqttRepository();
