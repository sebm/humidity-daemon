import { NestClient } from './nest-client';
import { HumidityReading, DaemonConfig } from './types';

export class HumidityMonitor {
  private nestClient: NestClient;
  private lastAlertTime: Map<string, number> = new Map();
  private readonly ALERT_COOLDOWN_MS = 30 * 60 * 1000; // 30 minutes

  constructor(private config: DaemonConfig) {
    this.nestClient = new NestClient(config);
  }

  async checkHumidity(): Promise<void> {
    try {
      console.log('Checking humidity levels...');
      const readings = await this.nestClient.getHumidityReadings();

      if (readings.length === 0) {
        console.log('No thermostats with humidity data found');
        return;
      }

      for (const reading of readings) {
        console.log(`Humidity: ${reading.value}%`);
        
        if (reading.value > this.config.humidityThreshold) {
          await this.handleHighHumidity(reading);
        }
      }
    } catch (error) {
      console.error('Error checking humidity:', error);
    }
  }

  private async handleHighHumidity(reading: HumidityReading): Promise<void> {
    const deviceId = reading.deviceId;
    const lastAlert = this.lastAlertTime.get(deviceId) || 0;
    const now = Date.now();

    if (now - lastAlert < this.ALERT_COOLDOWN_MS) {
      console.log(`Skipping alert (cooldown active)`);
      return;
    }

    const message = `HIGH HUMIDITY ALERT: ${reading.value}% (threshold: ${this.config.humidityThreshold}%)`;
    
    if (this.config.enableNotifications) {
      try {
        await this.nestClient.sendNotification(message, deviceId);
        this.lastAlertTime.set(deviceId, now);
        console.log(`Alert sent: ${message}`);
      } catch (error) {
        console.error(`Failed to send alert:`, error);
      }
    } else {
      console.log(`[DISABLED] ${message}`);
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      const readings = await this.nestClient.getHumidityReadings();
      console.log(`Connected successfully. Found ${readings.length} thermostats with humidity data.`);
      return true;
    } catch (error) {
      console.error('Connection test failed:', error);
      return false;
    }
  }
}