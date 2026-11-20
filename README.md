# Multi-Agent Business Assistant (Boardroom)

Users describe a business idea. Four AI agents collaborate in sequence and produce a business plan:

1. **CEO** — vision, value proposition, priorities, risks  
2. **Marketing Manager** — ICP, positioning, GTM, messaging  
3. **Financial Analyst** — revenue model, pricing, unit economics, runway  
4. **Software Engineer** — MVP, stack, architecture, delivery roadmap  
5. **CEO (synthesis)** — unified markdown business plan

## Quick start

```bash
cd multi-agent-business-assistant
npm install
npm run dev
```

- UI: http://localhost:5177  
- API: http://localhost:8787  

Without an API key the app runs in **demo mode** (scripted collaborative outputs so you can still demo the flow).

### Live LLM mode

```bash
cp .env.example .env
# set OPENAI_API_KEY=sk-...
npm run dev
```

Optional: `OPENAI_MODEL=gpt-4o-mini` (default).

## How collaboration works

```
Founder idea
    ↓
CEO notes
    ↓
Marketing (sees CEO)
    ↓
Finance (sees CEO + Marketing)
    ↓
Engineering (sees all prior)
    ↓
CEO synthesis → final business plan
```

Each agent receives the original idea plus prior agent outputs. The UI streams progress over Server-Sent Events (`POST /api/plan` with `{ stream: true }`).

## API

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/health` | Mode (`demo` \| `openai`) + agent roster |
| `GET` | `/api/agents` | Agent metadata |
| `POST` | `/api/plan` | Body: `{ idea, stream? }` → full JSON or SSE |

## Production build

```bash
npm run build
NODE_ENV=production npm start
```

Serves the Vite build from the Express server on `PORT` (default `8787`).
