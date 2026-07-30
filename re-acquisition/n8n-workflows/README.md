# RE Acquisition n8n Workflows

Import these JSON files into n8n (http://localhost:5678) after starting the AI stack.

| File | Webhook path | Purpose |
|------|--------------|---------|
| `voice-extraction.json` | `POST /webhook/re-voice/extract` | Seller call transcript → Ollama → Twenty CRM |
| `capture-media-upload.json` | `POST /webhook/re-capture/media` | PWA phase-1 media upload |
| `capture-bundle-submit.json` | `POST /webhook/re-capture/bundle` | PWA phase-2 bundle → Twenty + voice trigger |
| `deal-stage-notification.json` | `POST /webhook/re-contract/deal-stage-changed` | Slack/email on stage change |
| `contract-generation.json` | `POST /webhook/re-contract/generate` | PDF contract on OFFER_OUT |
| `task-reminder.json` | (cron) | DD deadline reminders |

## Credentials

Create an **HTTP Header Auth** credential in n8n:
- Header: `Authorization`
- Value: `Bearer <TWENTY_API_KEY>`

Assign to all Twenty HTTP Request nodes.

## Environment variables (docker-compose.ai.yml)

```
TWENTY_API_URL=http://host.docker.internal:3000
TWENTY_API_KEY=
N8N_VOICE_WEBHOOK_SECRET=
N8N_CAPTURE_WEBHOOK_SECRET=
N8N_CONTRACT_WEBHOOK_SECRET=
OLLAMA_BASE_URL=http://ollama:11434
OLLAMA_MODEL=qwen2.5:7b
```

## Activate workflows

After import, toggle each workflow to **Active**.
