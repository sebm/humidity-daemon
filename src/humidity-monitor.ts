import { NestClient } from './nest-client';
import { PagerDutyClient } from './pagerduty-client';
import { FirestoreClient, AlertState } from './firestore-client';
import { HumidityReading, DaemonConfig } from './types';

export class HumidityMonitor {
  private nestClient: NestClient;
  private pagerDutyClient: PagerDutyClient;
  private firestoreClient: FirestoreClient;
  private readonly ALERT_COOLDOWN_MS = 30 * 60 * 1000; // 30 minutes

  constructor(private config: DaemonConfig) {
    this.nestClient = new NestClient(config);
    this.pagerDutyClient = new PagerDutyClient(config);
    this.firestoreClient = new FirestoreClient();
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
        } else {
          await this.handleNormalHumidity(reading);
        }
      }
    } catch (error) {
      console.error('Error checking humidity:', error);
    }
  }

  private async handleHighHumidity(reading: HumidityReading): Promise<void> {
    const deviceId = reading.deviceId;
    const alertState = await this.firestoreClient.getAlertState(deviceId);
    const now = Date.now();

    // Check cooldown period
    if (alertState && alertState.lastAlertTime && (now - alertState.lastAlertTime < this.ALERT_COOLDOWN_MS)) {
      console.log(`Skipping alert (cooldown active)`);
      return;
    }

    const message = `HIGH HUMIDITY ALERT: ${reading.value}% (threshold: ${this.config.humidityThreshold}%)`;
    
    if (this.config.enableNotifications) {
      try {
        const dedupKey = await this.pagerDutyClient.triggerAlert(
          message,
          'humidity-daemon',
          {
            humidity_percent: reading.value,
            device_id: deviceId,
            location: 'basement' // Could extract from device data
          }
        );
        
        // Save alert state to Firestore
        const newAlertState: AlertState = {
          deviceId,
          dedupKey,
          lastAlertTime: now,
          isActive: true,
          humidityLevel: reading.value,
          threshold: this.config.humidityThreshold,
          createdAt: alertState?.createdAt || new Date(),
          updatedAt: new Date()
        };
        
        await this.firestoreClient.setAlertState(newAlertState);
        console.log(`PagerDuty alert triggered: ${message}`);
      } catch (error) {
        console.error(`Failed to send PagerDuty alert:`, error);
        // Fallback to console notification
        console.log(`[FALLBACK] ${message}`);
      }
    } else {
      console.log(`[DISABLED] ${message}`);
    }
  }

  private async handleNormalHumidity(reading: HumidityReading): Promise<void> {
    const deviceId = reading.deviceId;
    const alertState = await this.firestoreClient.getAlertState(deviceId);

    // If there's an active alert and humidity is now normal, resolve it
    if (alertState && alertState.isActive && this.config.enableNotifications) {
      try {
        await this.pagerDutyClient.resolveAlert(
          alertState.dedupKey,
          `Humidity normalized: ${reading.value}% (threshold: ${this.config.humidityThreshold}%)`
        );
        
        // Update Firestore to mark alert as resolved
        await this.firestoreClient.updateAlertState(deviceId, {
          isActive: false,
          humidityLevel: reading.value
        });
        
        console.log(`Humidity normalized: ${reading.value}% - PagerDuty alert resolved`);
      } catch (error) {
        console.error('Failed to resolve PagerDuty alert:', error);
      }
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

  async resetAlertStates(): Promise<void> {
    try {
      const activeAlerts = await this.firestoreClient.getAllActiveAlerts();
      for (const alert of activeAlerts) {
        await this.firestoreClient.deleteAlertState(alert.deviceId);
        console.log(`Deleted alert state for device: ${alert.deviceId}`);
      }
    } catch (error) {
      console.error('Error resetting alert states:', error);
    }
  }
}