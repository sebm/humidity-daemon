# Humidity Monitor

A serverless TypeScript function that monitors humidity levels via Google Nest Smart Device Management API and sends PagerDuty alerts when thresholds are exceeded. Runs on Google Cloud Functions for ~$0.50/month.

## Prerequisites

- Node.js 18+ and npm
- Google Cloud account with billing enabled
- Google Cloud CLI (`gcloud`) installed
- Google Nest Device Access account ($5 one-time fee)
- Nest Thermostat with humidity sensor
- PagerDuty account

## Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Google Cloud Project Setup

1. **Create Google Cloud Project:**
   - Go to [Google Cloud Console](https://console.cloud.google.com)
   - Create a new project
   - Enable the Smart Device Management API

2. **Create OAuth 2.0 Credentials:**
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth 2.0 Client ID"
   - Choose "Web application"
   - Add authorized redirect URIs:
     - `http://localhost:8080`
     - `https://www.google.com`
   - Download the credentials JSON

3. **Configure OAuth Consent Screen:**
   - Go to "APIs & Services" > "OAuth consent screen"
   - Choose "External" user type
   - Add your email as a test user
   - Add scope: `https://www.googleapis.com/auth/sdm.service`

### 3. Device Access Setup

1. **Register for Device Access:**
   - Go to [Device Access Console](https://console.nest.google.com/device-access/)
   - Pay the $5 one-time registration fee
   - Create a new project
   - Link it to your Google Cloud project
   - Add your OAuth client ID

2. **Authorize Partner Connection:**
   - Use this URL format to authorize access:
   ```
   https://nestservices.google.com/partnerconnections/[DEVICE_ACCESS_PROJECT_ID]/auth?redirect_uri=https://www.google.com&access_type=offline&prompt=consent&client_id=[OAUTH_CLIENT_ID]&response_type=code&scope=https://www.googleapis.com/auth/sdm.service
   ```
   - Replace `[DEVICE_ACCESS_PROJECT_ID]` and `[OAUTH_CLIENT_ID]` with your values
   - Complete the authorization flow

### 4. Get Refresh Token

1. **Initial OAuth Flow:**
   ```
   https://accounts.google.com/o/oauth2/auth?client_id=[OAUTH_CLIENT_ID]&redirect_uri=http://localhost:8080&scope=https://www.googleapis.com/auth/sdm.service&response_type=code&access_type=offline&prompt=consent
   ```

2. **Exchange authorization code for refresh token:**
   ```bash
   curl -L -X POST 'https://oauth2.googleapis.com/token' \
     -H 'Content-Type: application/x-www-form-urlencoded' \
     --data-urlencode 'client_id=[CLIENT_ID]' \
     --data-urlencode 'client_secret=[CLIENT_SECRET]' \
     --data-urlencode 'code=[AUTHORIZATION_CODE]' \
     --data-urlencode 'grant_type=authorization_code' \
     --data-urlencode 'redirect_uri=http://localhost:8080'
   ```

### 5. Configuration

The project uses two configuration files:
- `.env` - For local development and testing
- `.env.yaml` - For Google Cloud Functions deployment

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` with your credentials:
   ```env
   NEST_CLIENT_ID=your_oauth_client_id
   NEST_CLIENT_SECRET=your_oauth_client_secret
   NEST_REFRESH_TOKEN=your_refresh_token
   NEST_PROJECT_ID=your_device_access_project_id
   HUMIDITY_THRESHOLD=60
   CHECK_INTERVAL_MINUTES=5
   ENABLE_NOTIFICATIONS=true
   PAGERDUTY_INTEGRATION_KEY=your_pagerduty_integration_key
   PAGERDUTY_SEVERITY=error
   ```

### 6. PagerDuty Setup

1. **Create PagerDuty Service:**
   - Go to [PagerDuty](https://app.pagerduty.com)
   - Create a new Service or use existing
   - Add an "Events API v2" integration
   - Copy the Integration Key

2. **Configure Integration:**
   - Set `PAGERDUTY_INTEGRATION_KEY` in your `.env`
   - Choose severity level: `info`, `warning`, `error`, or `critical`

### 7. Google Cloud Setup

1. **Create Google Cloud Project** (if not using existing):
   ```bash
   gcloud projects create humidity-daemon --name="Humidity Monitor"
   gcloud config set project humidity-daemon
   ```

2. **Enable required APIs**:
   ```bash
   gcloud services enable cloudfunctions.googleapis.com
   gcloud services enable cloudscheduler.googleapis.com
   gcloud services enable firestore.googleapis.com
   ```

3. **Create Firestore database**:
   ```bash
   gcloud firestore databases create --region=us-central1
   ```

### 8. Deploy to Google Cloud Functions

1. **Build the project**:
   ```bash
   npm install
   npm run build
   ```

2. **Configure environment variables**:
   ```bash
   cp .env.yaml.example .env.yaml
   # Edit .env.yaml with your actual values
   ```

3. **Deploy the function**:
   ```bash
   gcloud functions deploy humidity-monitor \
     --runtime nodejs20 \
     --trigger-http \
     --allow-unauthenticated \
     --source . \
     --entry-point humidityMonitor \
     --memory 256MB \
     --timeout 60s \
     --env-vars-file .env.yaml
   ```

4. **Create Cloud Scheduler job** (every 5 minutes):
   ```bash
   gcloud scheduler jobs create http humidity-monitor-cron \
     --schedule="*/5 * * * *" \
     --uri="https://us-central1-humidity-daemon.cloudfunctions.net/humidity-monitor" \
     --http-method=GET \
     --location=us-central1
   ```

### 9. Test the Function

**Manual test**:
```bash
gcloud functions call humidity-monitor
```

**HTTP test**:
```bash
curl "https://us-central1-humidity-daemon.cloudfunctions.net/humidity-monitor"
```

## Usage

### Local Development
```bash
# Test the function locally
npm run dev

# Build for deployment
npm run build
```

### Cloud Function Management

**View logs**:
```bash
gcloud functions logs read humidity-monitor --limit=50
```

**Update function**:
```bash
npm run build
npm run deploy
```

**View scheduler status**:
```bash
gcloud scheduler jobs list
gcloud scheduler jobs describe humidity-monitor-cron
```

**Pause/resume monitoring**:
```bash
# Pause
gcloud scheduler jobs pause humidity-monitor-cron

# Resume
gcloud scheduler jobs resume humidity-monitor-cron
```

### Cost Monitoring

Monitor your costs in the [Google Cloud Console](https://console.cloud.google.com/billing):
- **Cloud Functions**: ~$0.40/month for 8,760 executions
- **Firestore**: Free tier (1GB storage, 20K writes/day)
- **Cloud Scheduler**: $0.10/month per job

## Configuration Options

- `NEST_CLIENT_ID`: OAuth 2.0 client ID from Google Cloud
- `NEST_CLIENT_SECRET`: OAuth 2.0 client secret from Google Cloud
- `NEST_REFRESH_TOKEN`: OAuth refresh token for API access
- `NEST_PROJECT_ID`: Device Access project ID (UUID format)
- `HUMIDITY_THRESHOLD`: Humidity percentage threshold (default: 60)
- `CHECK_INTERVAL_MINUTES`: Check frequency in minutes (default: 5)
- `ENABLE_NOTIFICATIONS`: Enable/disable alert notifications (default: true)
- `PAGERDUTY_INTEGRATION_KEY`: PagerDuty Events API v2 integration key
- `PAGERDUTY_SEVERITY`: Alert severity level (info, warning, error, critical)

## Features

- ✅ **Serverless monitoring** - Runs on Google Cloud Functions
- ✅ **Cost effective** - ~$0.50/month total cost
- ✅ **PagerDuty integration** - Real-time alerting with auto-resolution
- ✅ **Persistent state** - Firestore for alert tracking across executions
- ✅ **Configurable thresholds** - Set custom humidity levels
- ✅ **Alert cooldown** - 30-minute cooldown prevents spam
- ✅ **Automatic OAuth refresh** - Handles Nest API authentication
- ✅ **Scheduled execution** - Cloud Scheduler triggers every 5 minutes
- ✅ **TypeScript** - Full type safety and modern development

## Architecture

```
Cloud Scheduler (every 5 min) → Cloud Function → Nest API → PagerDuty
                                      ↓
                                  Firestore (alert state)
```

## Scripts

- `npm run build` - Compile TypeScript for deployment
- `npm run start` - Run function locally with Functions Framework
- `npm run dev` - Run function locally in development mode
- `npm run deploy` - Deploy function to Google Cloud
- `npm run lint` - Lint the code
- `npm run typecheck` - Type check without emitting

## Troubleshooting

**No devices found:**
- Ensure Device Access project is authorized via Partner Connection Manager
- Verify OAuth client has correct redirect URIs
- Check that your Google account owns the Nest devices
- Confirm Device Access project is linked to correct Google Cloud project

**OAuth errors:**
- Add test user email in OAuth consent screen
- Verify redirect URIs match exactly
- Ensure all required scopes are configured

**PagerDuty errors:**
- Verify Integration Key is correct (from Events API v2 integration)
- Check PagerDuty service is active and properly configured
- Ensure network connectivity to PagerDuty API endpoints

**Cloud Function errors:**
- Check function logs: `gcloud functions logs read humidity-monitor`
- Verify environment variables are set correctly
- Ensure Firestore database is created and accessible
- Check IAM permissions for Cloud Functions service account

**Cost optimization:**
- Monitor usage in Google Cloud Console
- Adjust scheduler frequency if needed
- Consider using Cloud Monitoring for alerting instead of frequent checks