import { describe, expect, it } from 'vitest';
import dotenv from 'dotenv';

import { MqttRepository} from '../repositories/mqtt.Repository.js';

// Load environment variables from .env file
const result = dotenv.config();
if (result.error) {
    console.warn('No .env file found or error loading .env. Ensure environment variables are set for MQTT connection.');
};

describe('Environment found', () => {
    it('should have found the .env file', () => {
        expect(result.error).toBeUndefined();
    });
  } 
) 

describe('mqtt connection', () => {
    it('runs tests', () => {
        expect(result.error).toBe(undefined);
        expect(process.env.MQTT_HOST).toBeDefined();
        expect(process.env.MQTT_USERNAME).toBeDefined();
        expect(process.env.MQTT_PASSWORD).toBeDefined();
    });
});

