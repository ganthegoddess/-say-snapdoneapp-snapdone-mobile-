# SnapDone Expo Dev Server — Tunnel Info

## Status: ✅ Running (alive since Jul 17)

## How to connect from phone

### Option 1: Scan QR code (fastest)
Open your phone camera and scan:
https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=exp%3A%2F%2Fbmv2_c0-anonymous-8081.exp.direct

### Option 2: Type URL in Expo Go
1. Open Expo Go on your phone
2. Tap "Enter URL manually"
3. Type or paste: `exp://bmv2_c0-anonymous-8081.exp.direct`

### Option 3: Use LAN (if on same Wi-Fi)
If the tunnel doesn't load, find your computer's local IP and use:
```
exp://<YOUR_LOCAL_IP>:8081
```
Run `ip addr show | grep "inet "` to find your IP.

### Option 4: Use the direct HTTP URL (browser)
`https://bmv2_c0-anonymous-8081.exp.direct`

## Servers running
| Service | Port | Status |
|---------|------|--------|
| Expo dev server | 8081 | ✅ Listening |
| Ngrok tunnel | — | ✅ Connected |

## API backend
The app connects to: `https://5f7a3e77abaf27c48a69cce1b874bb58.ctonew.app`
(Verified: returns `{"status":"ok","database":true}` on `/api/v1/health`)

## If it stops working
```bash
# Check if still running
ss -Htln | grep 8081

# Kill any stale processes
sudo sh -c 'lsof -t -iTCP:8081 -sTCP:LISTEN | xargs -r kill -9 2>/dev/null'

# Restart with tunnel (properly detached)
cd /home/team/shared/mobile
setsid npx expo start --tunnel --port 8081 > /tmp/expo-output.log 2>&1 &

# Wait 10 seconds, then check the tunnel URL
curl -s http://127.0.0.1:4040/api/tunnels
```
