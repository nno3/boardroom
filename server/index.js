/**
 * Multi-Agent Business Assistant API
 * Runs CEO → Marketing → Finance → Engineering → CEO synthesis.
 */
require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');
const OpenAI = require('openai');
const {
  AGENTS,
  CEO_SYNTHESIS,
  buildUserPrompt,
  demoResponse,
} = require('./agents');

const app = express();
const PORT = process.env.PORT || 8787;
const MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';

app.use(cors({ origin: true }));
app.use(express.json({ limit: '100kb' }));

function getClient() {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) return null;
  return new OpenAI({ apiKey: key });
}

async function runAgent(client, agent, idea, priorTurns) {
  if (!client) {
    // Simulate thinking time so the UI can show collaboration progress
    await new Promise((r) => setTimeout(r, 400 + Math.random() * 500));
    return demoResponse(agent, idea, priorTurns);
  }

  const completion = await client.chat.completions.create({
    model: MODEL,
    temperature: 0.55,
    messages: [
      { role: 'system', content: agent.system },
      { role: 'user', content: buildUserPrompt(idea, priorTurns, agent) },
    ],
  });

  return completion.choices[0]?.message?.content?.trim() || '_No response._';
}

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    mode: process.env.OPENAI_API_KEY?.trim() ? 'openai' : 'demo',
    agents: AGENTS.map(({ id, name, title, color, focus }) => ({
      id,
      name,
      title,
      color,
      focus,
    })),
  });
});

app.get('/api/agents', (_req, res) => {
  res.json({
    agents: [
      ...AGENTS.map(({ id, name, title, color, focus }) => ({
        id,
        name,
        title,
        color,
        focus,
      })),
      {
        id: CEO_SYNTHESIS.id,
        name: CEO_SYNTHESIS.name,
        title: CEO_SYNTHESIS.title,
        color: CEO_SYNTHESIS.color,
        focus: CEO_SYNTHESIS.focus,
      },
    ],
  });
});

/**
 * POST /api/plan
 * Body: { idea: string, stream?: boolean }
 * Non-stream returns full plan; stream=true uses SSE for live agent turns.
 */
app.post('/api/plan', async (req, res) => {
  const idea = String(req.body?.idea || '').trim();
  const stream = Boolean(req.body?.stream);

  if (idea.length < 20) {
    return res.status(400).json({
      success: false,
      message: 'Describe your business idea in at least a couple of sentences (20+ characters).',
    });
  }
  if (idea.length > 4000) {
    return res.status(400).json({
      success: false,
      message: 'Idea is too long (max 4000 characters).',
    });
  }

  const client = getClient();
  const pipeline = [...AGENTS, CEO_SYNTHESIS];
  const turns = [];

  if (stream) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    const send = (event, data) => {
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    };

    send('meta', {
      mode: client ? 'openai' : 'demo',
      total: pipeline.length,
    });

    try {
      for (let i = 0; i < pipeline.length; i++) {
        const agent = pipeline[i];
        send('agent_start', {
          index: i,
          id: agent.id,
          name: agent.name,
          title: agent.title,
          color: agent.color,
          focus: agent.focus,
        });

        const content = await runAgent(client, agent, idea, turns);
        const turn = {
          id: agent.id,
          name: agent.name,
          title: agent.title,
          color: agent.color,
          focus: agent.focus,
          content,
        };
        turns.push(turn);
        send('agent_done', { index: i, turn });
      }

      send('complete', {
        idea,
        mode: client ? 'openai' : 'demo',
        turns,
        plan: turns[turns.length - 1]?.content || '',
      });
      res.end();
    } catch (err) {
      console.error('plan stream error:', err);
      send('error', { message: err.message || 'Agent collaboration failed' });
      res.end();
    }
    return;
  }

  try {
    for (const agent of pipeline) {
      const content = await runAgent(client, agent, idea, turns);
      turns.push({
        id: agent.id,
        name: agent.name,
        title: agent.title,
        color: agent.color,
        focus: agent.focus,
        content,
      });
    }

    res.json({
      success: true,
      data: {
        idea,
        mode: client ? 'openai' : 'demo',
        turns,
        plan: turns[turns.length - 1]?.content || '',
      },
    });
  } catch (err) {
    console.error('plan error:', err);
    res.status(500).json({
      success: false,
      message: err.message || 'Agent collaboration failed',
    });
  }
});

if (process.env.NODE_ENV === 'production') {
  const dist = path.join(__dirname, '..', 'client', 'dist');
  app.use(express.static(dist));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(dist, 'index.html'));
  });
}

app.listen(PORT, () => {
  const mode = process.env.OPENAI_API_KEY?.trim() ? 'OpenAI' : 'demo (no API key)';
  console.log(`Multi-Agent Business Assistant on http://localhost:${PORT} [${mode}]`);
});
