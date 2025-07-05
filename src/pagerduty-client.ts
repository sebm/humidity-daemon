import { event } from '@pagerduty/pdjs';
import { DaemonConfig } from './types';

export class PagerDutyClient {
  constructor(private config: DaemonConfig) {}

  async triggerAlert(summary: string, source: string, details: any = {}): Promise<string> {
    try {
      const response = await event({
        data: {
          routing_key: this.config.pagerDutyIntegrationKey,
          event_action: 'trigger',
          dedup_key: `humidity-alert-${source}`,
          payload: {
            summary,
            source,
            severity: this.config.pagerDutySeverity,
            component: 'humidity-daemon',
            group: 'nest-monitoring',
            class: 'humidity',
            custom_details: {
              ...details,
              threshold: this.config.humidityThreshold,
              timestamp: new Date().toISOString()
            }
          }
        }
      });

      if (response.data.status === 'success') {
        console.log(`PagerDuty alert triggered: ${response.data.dedup_key}`);
        return response.data.dedup_key;
      } else {
        throw new Error(`PagerDuty API error: ${response.data.status}`);
      }
    } catch (error) {
      console.error('Failed to trigger PagerDuty alert:', error);
      throw error;
    }
  }

  async resolveAlert(dedupKey: string, summary: string): Promise<void> {
    try {
      const response = await event({
        data: {
          routing_key: this.config.pagerDutyIntegrationKey,
          event_action: 'resolve',
          dedup_key: dedupKey,
          payload: {
            summary,
            source: 'humidity-daemon',
            severity: 'info'
          }
        }
      });

      if (response.data.status === 'success') {
        console.log(`PagerDuty alert resolved: ${dedupKey}`);
      } else {
        throw new Error(`PagerDuty API error: ${response.data.status}`);
      }
    } catch (error) {
      console.error('Failed to resolve PagerDuty alert:', error);
      throw error;
    }
  }

  async acknowledgeAlert(dedupKey: string): Promise<void> {
    try {
      const response = await event({
        data: {
          routing_key: this.config.pagerDutyIntegrationKey,
          event_action: 'acknowledge',
          dedup_key: dedupKey,
          payload: {
            summary: 'Alert acknowledged',
            source: 'humidity-daemon',
            severity: 'info'
          }
        }
      });

      if (response.data.status === 'success') {
        console.log(`PagerDuty alert acknowledged: ${dedupKey}`);
      } else {
        throw new Error(`PagerDuty API error: ${response.data.status}`);
      }
    } catch (error) {
      console.error('Failed to acknowledge PagerDuty alert:', error);
      throw error;
    }
  }
}