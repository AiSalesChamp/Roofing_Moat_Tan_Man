# AI-Native Spatial Gap Analysis — Twenty-20 RE Acquisition CRM

**Date:** July 11, 2026  
**Scope:** Gap analysis between current Twenty-20 fork and owner vision (AI-native, locally hosted, spatial/voice/gesture-ready)

---

## Executive Summary

You have built a **solid v1 land-acquisition CRM** on top of Twenty — custom objects, deal pipeline, contract generation, voice extraction specs, mobile capture specs, and a wholesale-first land funnel playbook. The architecture is **documentation- and workflow-heavy** but **not yet agentic or spatial**.

The core mismatch: you designed for a **desktop web CRM** (forms, kanban, tables) while your mental model is **ambient, on-the-go, glasses-first**. The good news: your data model and funnel logic are already right. The gap is **interface + intelligence delivery**, not business logic.

**Top 3 immediate actions:**
1. Wire **Ollama** locally and connect `acquisition-voice/` prompts to run offline against your CRM API.
2. Ship **property-capture** as a PWA (not just n8n spec) — phone-first, offline, voice notes → CRM.
3. Add a **deal copilot** layer (Open WebUI or Twenty's built-in agents) that answers "what should I do on this parcel today?" from CRM data.

---

## Current Architecture

### Core platform
| Layer | What it is |
|---|---|
| **Twenty CRM** | Nx monorepo — React frontend (:3001), NestJS/GraphQL API (:3000), Postgres, Redis, BullMQ worker |
| **RE Acquisition app** | `packages/twenty-apps/re-acquisition/` — Property, ComparableSale, CallLog, CallTranscript objects; `dealStage` pipeline; wholesale/land/flip views |
| **Local launch** | `start-local.sh` / `launch-crm.sh` — Docker Postgres+Redis, optional DocuSeal+Gotenberg for contracts |

### Custom RE layer (`re-acquisition/`)
| Module | Status | Purpose |
|---|---|---|
| **land-funnel/** | ✅ Documented + HTML previews | Wholesale-first TX land playbook, KPI dashboard, scripts |
| **contracts/** | ✅ Built | Gotenberg PDF + DocuSeal e-sign → auto-advance `dealStage` |
| **acquisition-voice/** | 📋 Spec only | Seller call + site memo LLM extraction prompts/schemas |
| **property-capture/** | 📋 Spec only | Mobile capture bundle → n8n → Twenty REST |
| **n8n-workflows/** | 📋 JSON templates | Deal notifications, contract gen, task reminders |

### Vendored reference repos (not custom integrations)
`crewAI/`, `langgraph/`, `n8n/`, `temporal/`, `airbyte/`, `supabase/`, `erpnext/`, `frappe/` — cloned upstream repos for reference, not wired into the running CRM.

### Data flow today
```
Lead source → manual CRM entry OR (planned) mobile capture → n8n → Twenty REST
Seller call → (planned) voice memo → LLM extraction → Twenty fields
Deal stage change → logic function → n8n → contract PDF → DocuSeal → webhook → CRM update
User views → desktop browser → kanban/tables/forms
```

### What's actually working vs. planned
| Working today | Planned / spec only |
|---|---|
| Full deal pipeline (Sourced → Exit Closed) | Mobile property capture PWA |
| Property, comps, contacts, call logs | Voice → structured CRM fields |
| Contract gen + e-sign automation | Skip-trace / parcel data enrichment |
| Land funnel playbook docs | Agentic deal recommendations |
| Local self-host via Docker | Local LLM inference |
| KPI dashboard page layout | Spatial / AR interface |

---

## Gaps

### 1. AI-Native gaps
| Gap | Impact |
|---|---|
| **No running agents** — CrewAI/LangGraph repos exist but aren't connected | You still do manual research, offer math, buyer matching |
| **Voice extraction is spec-only** | Seller calls don't auto-populate CRM fields |
| **No parcel intelligence** | No automated comp pull, lien check, zoning/utilities scoring |
| **No decision support** | CRM stores data but doesn't say "wholesale this" vs "hold for data center" |
| **n8n is template, not live** | Workflows designed but not the primary intelligence layer |

### 2. Local hosting gaps
| Gap | Impact |
|---|---|
| **LLM calls likely cloud-dependent** | Privacy + cost + offline field use blocked |
| **Heavy stack footprint** | Twenty + Docker + optional DocuSeal = significant RAM; no model serving layer |
| **No unified local AI router** | No Ollama/vLLM integration, no model selection by task |
| **Mobile capture needs cloud path** | Offline sync spec exists but no local-first inference on device |

### 3. Interface / UX gaps (web vs spatial)
| Gap | Impact |
|---|---|
| **Desktop-first CRM** | Wrong form factor for driving for dollars, site visits, seller calls |
| **No voice UI** | Can't talk to CRM while walking a parcel |
| **No gesture/spatial layer** | Vision of glasses + hand gestures is 0% implemented |
| **Insights buried in records** | Have to click into deals; no ambient "next action" surface |
| **No field-optimized capture** | Phone camera + GPS + voice should be primary input, not forms |

### 4. Data delivery gaps
| Gap | Impact |
|---|---|
| **Pull model** | You go to CRM; CRM doesn't come to you |
| **No proactive alerts** | DD deadlines exist as fields but no push to glasses/phone/watch |
| **No conversational layer** | Can't ask "show me TX land deals under $50k with utilities" by voice |
| **Playbook is docs, not runtime** | `land-funnel/` is excellent strategy but not executable by software |

---

## Build-On-Top Options

### Local LLM serving
| Project | Use for | Pros | Cons |
|---|---|---|---|
| [Ollama](https://ollama.com) | Local inference API | Dead simple, OpenAI-compatible API, runs on consumer GPU | Not highest throughput |
| [llama.cpp](https://github.com/ggerganov/llama.cpp) | Edge / CPU inference | Runs anywhere, whisper.cpp sibling for STT | More manual setup |
| [vLLM](https://github.com/vllm-project/vllm) | Production throughput | Fast concurrent serving | Needs real GPU, heavier |
| [Open WebUI](https://github.com/open-webui/open-webui) | Chat UI over Ollama | RAG, tools, voice — drop-in copilot shell | Another service to run |

**Plug-in:** Point `acquisition-voice/` prompts at `http://localhost:11434`. Use `llama3.2` or `qwen2.5` for extraction; `llava` for site photos.

### Voice (speech ↔ text)
| Project | Use for |
|---|---|
| [whisper.cpp](https://github.com/ggerganov/whisper.cpp) | Offline STT on your machine or phone |
| [faster-whisper](https://github.com/SYSTRAN/faster-whisper) | Fast local transcription for seller calls |
| [Piper TTS](https://github.com/rhasspy/piper) | Local text-to-speech responses |
| [OpenAI Realtime API](https://platform.openai.com/docs/guides/realtime) | Cloud fallback for low-latency voice (not local) |

### Agent frameworks
| Project | Use for |
|---|---|
| [LangGraph](https://github.com/langchain-ai/langgraph) | Already vendored — wire deal-stage agents |
| [CrewAI](https://github.com/crewAIInc/crewAI) | Multi-agent: sourcer + underwriter + dispo |
| [Twenty built-in agents](https://docs.twenty.com/user-guide/ai/overview) | Native CRM agent layer — lowest integration cost |
| [MCP servers](https://modelcontextprotocol.io) | Expose CRM + county data as tools for any agent |

### Mobile / field capture
| Project | Use for |
|---|---|
| PWA + IndexedDB | Implement `property-capture/offline-sync-spec.md` |
| [Capacitor](https://capacitorjs.com) | Wrap PWA as native app with camera/GPS |
| [n8n](https://n8n.io) self-hosted | Already templated — ingestion orchestration |

### Spatial / AR / glasses (2026 realistic)
| Project | Status | Use for |
|---|---|---|
| [HALO](https://github.com/camel-ai/halo) | Shipped for Even Realities G2 | Agent-on-glasses bridge — temple click → agent on laptop |
| [OpenGlasses](https://github.com/straff2002/OpenGlasses) | Active | Meta Ray-Ban glasses + local LLM on iPhone |
| [Aether Companion](https://github.com/ibrews/aether-companion) | Active | WebXR spatial AI + Ollama, Vision Pro / Quest |
| [MentraOS](https://github.com/Mentra-Community/MentraOS) | Open glasses OS | Cross-vendor AR app platform |
| [MediaPipe](https://github.com/google-ai-edge/mediapipe) | Production | Hand gesture tracking in browser/device |
| [WebXR Device API](https://immersiveweb.dev) | Standard | Browser-based spatial UI — no app store needed |
| [Tethyr](https://github.com/raghavrajsah/tethyr) | Experimental | AR + YOLO + Ollama vision for object grounding |

**Reality check:** Consumer AR glasses (Meta Ray-Ban, Even Realities) are usable today for **voice + display + basic HUD**. Full "expand windows with hand gestures in physical space" is **12–24 months** from daily-driver status for a solo operator. Bridge with **phone + voice + PWA** now; glasses as display/voice peripheral via HALO or OpenGlasses.

### RE data / skip trace (not self-hostable but API-integrable)
| Service | Use for |
|---|---|
| [PropStream](https://www.propstream.com) / [BatchLeads](https://batchleads.io) | List building, skip trace |
| [Regrid](https://regrid.com) / county GIS | Parcel boundaries, ownership |
| [ATTOM](https://www.attomdata.com) | Property data API |
| [LandWatch](https://www.landwatch.com) / [Land.com](https://www.land.com) | Land comps |

Wire these as n8n nodes or MCP tools — CRM stays source of truth.

---

## Phased Roadmap

### Phase 1 — Next 2 weeks: Make it AI-native on your box
1. **Install Ollama** + pull `qwen2.5:7b` (extraction) and `llava` (site photos)
2. **Run acquisition-voice prompts** against local Ollama — test seller-call → JSON → Twenty REST write
3. **Self-host n8n** — import `n8n-workflows/*.json`, connect to Twenty API key
4. **Enable Twenty agents** (built-in) with MCP tool for Postgres read + deal actions
5. **Add Open WebUI** as "deal copilot" sidebar — RAG over `land-funnel/` docs + CRM export

### Phase 2 — 1–3 months: Field-first interface
1. **Ship property-capture PWA** — camera, GPS, voice note, offline queue, sync to n8n
2. **Voice commands** — "log call with seller", "move deal to under contract" via Whisper + agent
3. **Parcel enrichment pipeline** — address in → county GIS + comp pull → auto-fill Property record
4. **Proactive notifications** — DD deadline, offer follow-up → phone push (ntfy.sh self-hosted or similar)
5. **Simplify stack** — drop unused vendored repos or move to `vendor/` to reduce confusion

### Phase 3 — 3–6 months: Agentic deal brain
1. **LangGraph deal router** — implements `land-funnel/` wholesale vs hold lane decision from parcel fields
2. **Offer generator** — inputs: comp, motivation, ARV → outputs: LOI terms, assignment fee target
3. **Buyer matcher** — tags on buyers list → auto-blast on `ACQUIRED` stage
4. **KPI loop** — fee income → reinvestment tracker per `07-capital-reinvestment-loop.md`

### Phase 4 — 6–12 months: Spatial bridge (aspirational but concrete)
1. **HALO or OpenGlasses** — voice query CRM while driving/doorknocking
2. **WebXR dashboard** — Aether-style floating deal cards for Vision Pro / Quest passthrough
3. **MediaPipe gestures** — swipe between deals in spatial view
4. **Local vision** — site walk → llava identifies utilities, access, flood plain from photos

---

## Recommended Next 3 Actions

1. **`ollama serve` + wire acquisition-voice** — your highest-ROI gap; seller calls become CRM records automatically.
2. **Build property-capture PWA** (even ugly v0) — shifts input from desktop forms to phone-in-field.
3. **Pick one glasses bridge to prototype** — HALO (if you get Even Realities) or OpenGlasses (if you have Meta Ray-Ban). Voice-only is fine for v0.

---

## What You Got Right

- Deal pipeline maps 1:1 to wholesale → hold routing
- Contract automation (offer → sign → stage advance) is real, not vapor
- Land funnel playbook is investor-grade strategy, not generic CRM docs
- Local self-host story works today with `start-local.sh`
- Twenty SDK app pattern is the right extensibility model

The product isn't wrong — the **delivery surface** is. You're one PWA + one local LLM + one voice loop away from feeling AI-native while keeping the spatial vision on a credible ramp.
