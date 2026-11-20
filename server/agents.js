/**
 * Role definitions and collaboration pipeline for the business-plan agents.
 */
const AGENTS = [
  {
    id: 'ceo',
    name: 'CEO',
    title: 'Chief Executive Officer',
    color: '#0f766e',
    focus: 'Vision, mission, value proposition, strategic priorities, risks',
    system: `You are the CEO of a virtual advisory board. Be decisive and concise.
Ground every recommendation in the founder's specific product, customers, and domain — never write a generic startup essay.
Given a business idea, produce:
1) Mission & vision (tied to this product)
2) Core value proposition (1–2 sentences naming the customer and outcome)
3) Target customer segments (specific to this idea)
4) Strategic priorities for the first 12 months
5) Top 3 risks and mitigation
Write in clear markdown with short headings. Do not invent fake fundraising amounts or fake traction.`,
  },
  {
    id: 'marketing',
    name: 'Marketing Manager',
    title: 'Marketing Manager',
    color: '#b45309',
    focus: 'Positioning, ICP, channels, messaging, launch plan',
    system: `You are a Marketing Manager on a virtual advisory board.
Using the business idea and the CEO's notes, produce advice that is specific to THIS product and audience:
1) Ideal customer profile (ICP) — demographics/behaviours for this idea
2) Positioning statement naming the product category and competitor/status quo
3) Competitive differentiation (3 bullets) relevant to this space
4) Go-to-market channels for months 1–6 that fit where these customers already are
5) Launch messaging (headline + 3 supporting points)
6) Simple content / campaign calendar outline
Write in markdown. Stay practical and budget-aware for an early-stage idea.`,
  },
  {
    id: 'finance',
    name: 'Financial Analyst',
    title: 'Financial Analyst',
    color: '#1d4ed8',
    focus: 'Revenue model, unit economics, costs, projections',
    system: `You are a Financial Analyst on a virtual advisory board.
Using the idea, CEO strategy, and marketing plan, produce numbers and models that fit THIS business (B2B vs B2C, marketplace vs SaaS, etc.):
1) Revenue model options (pick a primary recommendation and say why for this idea)
2) Pricing hypothesis with example price points labelled as estimates
3) Cost structure (fixed vs variable, high-level)
4) Unit economics sketch (CAC, LTV assumptions — label as estimates)
5) 12-month rough P&L outline (conservative / base / optimistic as brief bullets)
6) Funding needs and runway considerations
Use markdown. Clearly mark figures as illustrative estimates, not audited forecasts.`,
  },
  {
    id: 'engineer',
    name: 'Software Engineer',
    title: 'Software Engineer',
    color: '#7c3aed',
    focus: 'MVP scope, architecture, stack, delivery plan',
    system: `You are a Software Engineer on a virtual advisory board.
Using prior agent outputs, design an MVP for THIS product (features must match the idea, not a generic app):
1) MVP feature list (must-have vs nice-to-have)
2) Suggested tech stack and why
3) High-level architecture (frontend, backend, data, integrations needed for this idea)
4) Security & privacy considerations relevant to the data involved
5) Delivery roadmap (4–6 week milestones)
6) Technical risks
Write in markdown. Prefer pragmatic choices for a small team.`,
  },
];

const CEO_SYNTHESIS = {
  id: 'synthesis',
  name: 'CEO',
  title: 'CEO — Final Synthesis',
  color: '#0f766e',
  focus: 'Unified business plan',
  system: `You are the CEO synthesizing the full advisory board into ONE coherent business plan for THIS specific idea.
Structure the final document as:
# Business Plan
## Executive Summary
## Problem & Opportunity
## Solution & Value Proposition
## Market & Go-to-Market
## Product & Technology
## Business Model & Financials
## Roadmap (90 days)
## Team Asks / Next Steps
Incorporate Marketing, Finance, and Engineering contributions. Keep names, customers, and product details from the founder idea. Keep it readable (aim for a strong 1–2 page plan in markdown).`,
};

function buildUserPrompt(idea, priorTurns, agent) {
  const prior = priorTurns
    .map((t) => `### ${t.name} (${t.title})\n${t.content}`)
    .join('\n\n');

  return `Founder's business idea (use THIS idea specifically — do not genericize away the product, customers, or domain):
"""
${idea.trim()}
"""

${prior ? `Prior advisory notes from other agents (build on them; do not contradict without saying why):\n${prior}\n\n` : ''}Your role: ${agent.title}.
Focus: ${agent.focus}.

Rules:
- Ground every section in the founder's idea above (names, customers, channels, tech, and numbers should fit THIS business).
- If information is missing, state assumptions clearly instead of inventing fake traction.
- Respond with your section only, in markdown.`;
}

/** Deterministic demo collaboration when no OPENAI_API_KEY is configured. */
function demoResponse(agent, idea, priorTurns) {
  const short = idea.trim().slice(0, 120);
  const label = short.length < idea.trim().length ? `${short}…` : short;

  switch (agent.id) {
    case 'ceo':
      return `## Mission & vision
Build a focused company around: **${label}** — solve a real pain with a clear product, then expand.

## Value proposition
Help customers achieve a concrete outcome faster and with less friction than current alternatives.

## Target segments
1. Early adopters already paying for a partial workaround  
2. SMBs or consumers with the same core job-to-be-done  
3. Later: adjacent niches that share the same workflow

## 12-month priorities
1. Validate demand with 10–20 design partners  
2. Ship a narrow MVP and measure retention  
3. Prove a repeatable acquisition channel  
4. Tighten unit economics before scaling spend

## Risks & mitigation
1. **Wrong ICP** → interview weekly; kill features that don’t move retention  
2. **Scope creep** → CEO-owned MVP freeze for 6 weeks  
3. **Channel failure** → test 2 channels before doubling budget`;

    case 'marketing':
      return `## ICP
People who feel the pain behind “${label}” at least weekly and already spend time/money on imperfect tools.

## Positioning
For [ICP] who struggle with [pain], our product is the [category] that [key outcome] — unlike [status quo], we [differentiator].

## Differentiation
- Faster time-to-value in the first session  
- Clearer outcomes than generic tools  
- Trust through transparency and simple onboarding

## GTM (months 1–6)
- Months 1–2: founder-led outreach + community posts  
- Months 3–4: content (problem/solution) + referral loop  
- Months 5–6: one paid channel only after organic signal

## Launch messaging
**Headline:** Get from idea to outcome without the usual friction.  
- Start in minutes, not days  
- Built for the job you actually need done  
- Expand only after the core loop works

## Calendar outline
Week 1–2: landing page + waitlist · Week 3–4: case notes · Week 5–6: launch thread + demo video`;

    case 'finance':
      return `## Revenue model (recommended)
Subscription (or usage tiers) aligned to ongoing value — easiest to forecast for early SaaS-like products.

## Pricing hypothesis
- Free / trial to reduce adoption friction  
- Starter paid tier for individuals/small teams  
- Growth tier for heavier usage (illustrative: $15–$79/seat/mo depending on B2B vs B2C)

## Cost structure
- **Fixed:** hosting, tooling, founder time, basic legal/accounting  
- **Variable:** payment fees, support load, acquisition spend

## Unit economics (estimates)
- Target **LTV:CAC ≥ 3** after channel learning  
- Payback under 12 months in base case  
- Label all CAC/LTV numbers as hypotheses until you have cohort data

## 12-month P&L sketch
- **Conservative:** slow organic growth, near break-even on variable costs  
- **Base:** one working channel, modest paid conversion  
- **Optimistic:** strong retention + referrals reduce CAC

## Funding & runway
Prioritize 6–12 months runway to learn; raise only after retention and channel proof, not before.`;

    case 'engineer':
      return `## MVP (must-have)
- Account + core workflow for the primary job-to-be-done  
- Persist user data securely  
- Basic analytics (activation, retention)  
- Admin/ops path to support early users

## Nice-to-have (later)
- Advanced automation, integrations, multi-tenant admin polish

## Stack suggestion
- **Web:** React + TypeScript  
- **API:** Node/Express or equivalent  
- **DB:** PostgreSQL  
- **Auth:** proven provider or solid JWT sessions  
Why: fast iteration, wide hiring pool, good ops tooling.

## Architecture
Client → API → DB; background jobs for email/notifications; third-party only where it saves months.

## Security & privacy
Least privilege, HTTPS, secrets in env, encrypt sensitive fields, clear data retention, audit access for PII.

## Delivery roadmap
- Weeks 1–2: auth + core entity model  
- Weeks 3–4: primary user flow + instrumentation  
- Weeks 5–6: harden, beta with design partners

## Technical risks
Integration delays, underestimating edge cases, premature microservices — keep the MVP modular monolith.`;

    case 'synthesis':
      return `# Business Plan

## Executive Summary
We will validate and launch a product around **${label}**, starting with a narrow MVP, founder-led GTM, and subscription-oriented monetization. Success in the first 90 days means activated users, early retention signal, and one channel worth repeating.

## Problem & Opportunity
Customers currently stitch together incomplete solutions. A focused product that delivers a clear outcome can win on speed and clarity.

## Solution & Value Proposition
A simple product that helps the ICP reach their outcome in the first session, then deepens value through retention loops.

## Market & Go-to-Market
Start with a sharp ICP, founder outreach, and content. Expand paid spend only after organic proof. Messaging emphasizes time-to-value and differentiation from the status quo.

## Product & Technology
Ship a modular MVP (auth, core workflow, analytics) on a pragmatic web stack (React + Node + PostgreSQL). Security and privacy are designed in from day one.

## Business Model & Financials
Primary model: subscription tiers with a free/trial on-ramp. Track CAC, LTV, and payback as estimates until cohorts exist. Aim for LTV:CAC ≥ 3 and 6–12 months runway for learning.

## Roadmap (90 days)
1. Freeze MVP scope and ship core loop  
2. Onboard design partners; measure activation/retention  
3. Publish launch assets; test one acquisition path  
4. Refine pricing after first paying users

## Team Asks / Next Steps
- Confirm ICP interviews this week  
- Agree MVP must-haves vs backlog  
- Set weekly metrics review (activation, retention, revenue experiments)`;

    default:
      return priorTurns.map((t) => t.content).join('\n\n') || label;
  }
}

module.exports = {
  AGENTS,
  CEO_SYNTHESIS,
  buildUserPrompt,
  demoResponse,
};
