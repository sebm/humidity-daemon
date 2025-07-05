import dotenv from 'dotenv';
import { DaemonConfig } from './types';

dotenv.config();

export const config: DaemonConfig = {
  nestClientId: process.env.NEST_CLIENT_ID || '',
  nestClientSecret: process.env.NEST_CLIENT_SECRET || '',
  nestRefreshToken: process.env.NEST_REFRESH_TOKEN || '',
  nestProjectId: process.env.NEST_PROJECT_ID || '',
  humidityThreshold: parseInt(process.env.HUMIDITY_THRESHOLD || '60'),
  checkIntervalMinutes: parseInt(process.env.CHECK_INTERVAL_MINUTES || '5'),
  enableNotifications: process.env.ENABLE_NOTIFICATIONS === 'true',
  pagerDutyIntegrationKey: process.env.PAGERDUTY_INTEGRATION_KEY || '',
  pagerDutySeverity: (process.env.PAGERDUTY_SEVERITY as 'info' | 'warning' | 'error' | 'critical') || 'error'
};

export function validateConfig(): string[] {
  const errors: string[] = [];
  
  if (!config.nestClientId) errors.push('NEST_CLIENT_ID is required');
  if (!config.nestClientSecret) errors.push('NEST_CLIENT_SECRET is required');
  if (!config.nestRefreshToken) errors.push('NEST_REFRESH_TOKEN is required');
  if (!config.nestProjectId) errors.push('NEST_PROJECT_ID is required');
  
  if (config.humidityThreshold < 0 || config.humidityThreshold > 100) {
    errors.push('HUMIDITY_THRESHOLD must be between 0 and 100');
  }
  
  if (config.checkIntervalMinutes < 1) {
    errors.push('CHECK_INTERVAL_MINUTES must be at least 1');
  }

  if (config.enableNotifications && !config.pagerDutyIntegrationKey) {
    errors.push('PAGERDUTY_INTEGRATION_KEY is required when notifications are enabled');
  }
  
  return errors;
}