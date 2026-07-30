# Property Capture PWA (v0)

Ugly-but-functional field capture app for RE acquisition.

## Features

- Address entry + GPS reverse-geocode
- Camera photos (up to 5)
- Hold-to-record voice memo
- IndexedDB offline queue with auto-sync on reconnect
- Two-phase upload to n8n → Twenty CRM

## Run locally

```bash
cd re-acquisition/property-capture/pwa
npx serve -l 3080
```

Open on phone: `http://<your-lan-ip>:3080`

## Settings

Configure in the app Settings tab:
- **n8n base URL** — use LAN IP when testing from phone (e.g. `http://192.168.1.10:5678`)
- **Webhook secret** — must match `N8N_CAPTURE_WEBHOOK_SECRET` in docker-compose.ai.yml

## Prerequisites

1. Twenty CRM running (`./start-local.sh`)
2. AI stack running (`docker compose -f re-acquisition/docker-compose.ai.yml up -d`)
3. Import n8n workflows: `capture-media-upload.json`, `capture-bundle-submit.json`
