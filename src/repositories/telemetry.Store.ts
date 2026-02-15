import { ChipStatus, SensorReading } from '../models/index.js';

export interface TelemetryStore {
    saveSensorReading(reading: SensorReading): Promise<void>;
    saveChipStatus(status: ChipStatus): Promise<void>;
}

export class NoopTelemetryStore implements TelemetryStore {
    public async saveSensorReading(_reading: SensorReading): Promise<void> {
        return;
    }

    public async saveChipStatus(_status: ChipStatus): Promise<void> {
        return;
    }
}

export const telemetryStore: TelemetryStore = new NoopTelemetryStore();
