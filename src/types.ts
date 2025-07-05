export interface HumidityReading {
  value: number;
  timestamp: Date;
  deviceId: string;
}

export interface NestDevice {
  name: string;
  deviceId: string;
  type: string;
  traits: {
    'sdm.devices.traits.Humidity'?: {
      ambientHumidityPercent: number;
    };
    'sdm.devices.traits.Temperature'?: {
      ambientTemperatureCelsius: number;
    };
  };
}

export interface NestApiResponse {
  devices: NestDevice[];
}

export interface DaemonConfig {
  nestClientId: string;
  nestClientSecret: string;
  nestRefreshToken: string;
  nestProjectId: string;
  humidityThreshold: number;
  checkIntervalMinutes: number;
  enableNotifications: boolean;
  pagerDutyIntegrationKey: string;
  pagerDutySeverity: 'info' | 'warning' | 'error' | 'critical';
}