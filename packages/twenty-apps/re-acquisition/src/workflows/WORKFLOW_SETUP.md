# Workflow Setup Guide

Twenty visual workflows complement the SDK logic functions in this app.
Configure these in **Settings → Workflows** after publishing the app.

## Recommended Workflows

### 1. New Deal Checklist (DATABASE_EVENT)

- **Trigger:** Opportunity created
- **Condition:** `dealType` is not empty
- **Actions:**
  - CREATE_RECORD Task: "Qualify seller motivation"
  - CREATE_RECORD Task: "Pull county parcel data"
  - CREATE_RECORD Task: "Run initial numbers (MAO)"

### 2. Offer Accepted (DATABASE_EVENT)

- **Trigger:** Opportunity updated, `dealStage` changed to `UNDER_CONTRACT`
- **Actions:** (Logic function `on-deal-stage-change` also creates tasks automatically)
  - SEND_EMAIL to deal owner: "Deal under contract — start DD"

### 3. Wholesale Disposition Alert (DATABASE_EVENT)

- **Trigger:** `dealStage` → `ACQUIRED` AND `dealType` contains `WHOLESALE`
- **Actions:**
  - FIND_RECORDS Person where `contactRole` contains `BUYER`
  - SEND_EMAIL or CREATE_RECORD Note with deal summary

### 4. DD Deadline Webhook (optional)

- **Trigger:** WEBHOOK from external calendar
- **Actions:** UPDATE_RECORD Opportunity `dueDiligenceDeadline`

## Logic Functions (Automated)

These run without manual workflow setup:

| Function | Trigger | Behavior |
|----------|---------|----------|
| `on-deal-stage-change` | opportunity.updated | Creates stage-specific task checklist |
| `on-profit-calculation` | opportunity.updated | Recalculates `projectedProfit` |
| `dd-deadline-reminder` | Daily cron 8am | Tasks for deals with DD deadline in 3 days |
