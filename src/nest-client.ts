import axios, { AxiosInstance } from 'axios';
import { NestApiResponse, HumidityReading, DaemonConfig } from './types';

export class NestClient {
  private axiosInstance: AxiosInstance;
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;

  constructor(private config: DaemonConfig) {
    this.axiosInstance = axios.create({
      baseURL: 'https://smartdevicemanagement.googleapis.com/v1',
      timeout: 10000,
    });
  }

  private async refreshAccessToken(): Promise<void> {
    try {
      const response = await axios.post('https://oauth2.googleapis.com/token', {
        client_id: this.config.nestClientId,
        client_secret: this.config.nestClientSecret,
        refresh_token: this.config.nestRefreshToken,
        grant_type: 'refresh_token',
      });

      this.accessToken = response.data.access_token;
      this.tokenExpiry = Date.now() + (response.data.expires_in * 1000);
    } catch (error) {
      console.error('Failed to refresh access token:', error);
      throw new Error('Authentication failed');
    }
  }

  private async ensureValidToken(): Promise<void> {
    if (!this.accessToken || Date.now() >= this.tokenExpiry - 60000) {
      await this.refreshAccessToken();
    }
  }



  async getHumidityReadings(): Promise<HumidityReading[]> {
    await this.ensureValidToken();

    try {
      const response = await this.axiosInstance.get<NestApiResponse>(
        `/enterprises/${this.config.nestProjectId}/devices`,
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
          },
        }
      );

      const readings: HumidityReading[] = [];
      const timestamp = new Date();

      for (const device of response.data.devices || []) {
        const humidityTrait = device.traits['sdm.devices.traits.Humidity'];
        if (humidityTrait) {
          // Extract device ID from the full path (e.g., "enterprises/.../devices/ID" -> "ID")
          const deviceId = device.name ? device.name.split('/').pop() : `device-${Math.random().toString(36).substr(2, 9)}`;
          readings.push({
            value: humidityTrait.ambientHumidityPercent,
            timestamp,
            deviceId: deviceId || `device-${Math.random().toString(36).substr(2, 9)}`,
          });
        }
      }

      return readings;
    } catch (error) {
      console.error('Failed to fetch humidity readings:', error);
      throw new Error('Failed to get humidity data from Nest API');
    }
  }

  async sendNotification(message: string, deviceId: string): Promise<void> {
    console.log(`[NOTIFICATION] ${message}`);
    
    try {
      await this.axiosInstance.post(
        `/enterprises/${this.config.nestProjectId}/devices/${deviceId}:executeCommand`,
        {
          command: 'sdm.devices.commands.CameraLiveStream.GenerateRtspStream',
          params: {}
        },
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
          },
        }
      );
    } catch (error) {
      console.error('Notification send failed (using console log as fallback):', error);
    }
  }
}