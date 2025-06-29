import * as cron from 'node-cron';
import { config, validateConfig } from './config';
import { HumidityMonitor } from './humidity-monitor';

class HumidityDaemon {
  private monitor: HumidityMonitor;
  private cronJob: cron.ScheduledTask | null = null;

  constructor() {
    this.monitor = new HumidityMonitor(config);
  }

  async start(): Promise<void> {
    console.log('Starting Humidity Daemon...');
    
    const configErrors = validateConfig();
    if (configErrors.length > 0) {
      console.error('Configuration errors:');
      configErrors.forEach(error => console.error(`  - ${error}`));
      process.exit(1);
    }

    console.log(`Humidity threshold: ${config.humidityThreshold}%`);
    console.log(`Check interval: ${config.checkIntervalMinutes} minutes`);
    console.log(`Notifications: ${config.enableNotifications ? 'enabled' : 'disabled'}`);

    const connected = await this.monitor.testConnection();
    if (!connected) {
      console.error('Failed to connect to Nest API. Please check your configuration.');
      process.exit(1);
    }

    const cronPattern = `*/${config.checkIntervalMinutes} * * * *`;
    this.cronJob = cron.schedule(cronPattern, async () => {
      await this.monitor.checkHumidity();
    });

    console.log(`Daemon started. Monitoring every ${config.checkIntervalMinutes} minutes.`);
    console.log('Press Ctrl+C to stop.');

    process.on('SIGINT', () => this.stop());
    process.on('SIGTERM', () => this.stop());
  }

  private stop(): void {
    console.log('\nStopping Humidity Daemon...');
    
    if (this.cronJob) {
      this.cronJob.stop();
      this.cronJob = null;
    }
    
    console.log('Daemon stopped.');
    process.exit(0);
  }
}

const daemon = new HumidityDaemon();
daemon.start().catch(error => {
  console.error('Failed to start daemon:', error);
  process.exit(1);
});