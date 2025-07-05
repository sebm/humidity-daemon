import { HttpFunction } from '@google-cloud/functions-framework/build/src/functions';
import { config, validateConfig } from './config';
import { HumidityMonitor } from './humidity-monitor';

export const humidityMonitor: HttpFunction = async (req, res) => {
  console.log('Humidity monitoring function triggered');
  
  try {
    // Validate configuration
    const configErrors = validateConfig();
    if (configErrors.length > 0) {
      console.error('Configuration errors:', configErrors);
      res.status(500).json({
        error: 'Configuration error',
        details: configErrors
      });
      return;
    }

    // Create monitor instance
    const monitor = new HumidityMonitor(config);
    
    // Test connection first
    const connected = await monitor.testConnection();
    if (!connected) {
      console.error('Failed to connect to Nest API');
      res.status(500).json({
        error: 'Failed to connect to Nest API',
        details: 'Please check your Nest API credentials and configuration'
      });
      return;
    }

    // Check for reset parameter (for testing)
    if (req.query.reset === 'true') {
      console.log('Resetting alert states for testing...');
      await monitor.resetAlertStates();
    }

    // Perform humidity check
    await monitor.checkHumidity();
    
    console.log('Humidity check completed successfully');
    res.status(200).json({
      success: true,
      message: 'Humidity check completed',
      timestamp: new Date().toISOString(),
      threshold: config.humidityThreshold
    });

  } catch (error) {
    console.error('Function execution failed:', error);
    res.status(500).json({
      error: 'Function execution failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};