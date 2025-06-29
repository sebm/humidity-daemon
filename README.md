# Humidity Daemon

A TypeScript daemon that monitors humidity levels via Google Nest Smart Device Management API and sends notifications when thresholds are exceeded.

## Prerequisites

- Node.js 18+ and npm
- Google Cloud account
- Google Nest Device Access account ($5 one-time fee)
- Nest Thermostat with humidity sensor

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
   ```

### 6. Build and Test

```bash
npm run build
npm run dev
```

## Usage

### Development
```bash
npm run dev
```

### Production
```bash
npm start
```

### As macOS Service

1. **Install service:**
   ```bash
   cp humidity-daemon.plist ~/Library/LaunchAgents/
   launchctl load ~/Library/LaunchAgents/humidity-daemon.plist
   ```

2. **Control service:**
   ```bash
   # Start
   launchctl start com.user.humidity-daemon
   
   # Stop
   launchctl stop com.user.humidity-daemon
   
   # Check status
   launchctl list | grep humidity-daemon
   
   # Uninstall
   launchctl unload ~/Library/LaunchAgents/humidity-daemon.plist
   ```

## Configuration Options

- `NEST_CLIENT_ID`: OAuth 2.0 client ID from Google Cloud
- `NEST_CLIENT_SECRET`: OAuth 2.0 client secret from Google Cloud
- `NEST_REFRESH_TOKEN`: OAuth refresh token for API access
- `NEST_PROJECT_ID`: Device Access project ID (UUID format)
- `HUMIDITY_THRESHOLD`: Humidity percentage threshold (default: 60)
- `CHECK_INTERVAL_MINUTES`: Check frequency in minutes (default: 5)
- `ENABLE_NOTIFICATIONS`: Enable/disable alert notifications (default: true)

## Features

- ✅ Monitors Nest Thermostat humidity levels
- ✅ Configurable humidity threshold alerts
- ✅ 30-minute alert cooldown to prevent spam
- ✅ Automatic OAuth token refresh
- ✅ macOS LaunchAgent support
- ✅ TypeScript with full type safety

## Logs

Service logs are written to:
- `daemon.log` - Standard output
- `daemon.error.log` - Error output

## Scripts

- `npm run build` - Compile TypeScript
- `npm run start` - Run compiled version
- `npm run dev` - Run with ts-node for development
- `npm run watch` - Watch mode compilation
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