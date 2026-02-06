export interface MqttChipStatusPayload {
    MCU_id: string;
    epoch_s: number;
    ip_address: string;
    [key: string]: unknown;
}

export interface ChipStatus {
    mcuId: string;
    timestamp: Date;
    ipAddress: string;
    details: Record<string, unknown>;
}
