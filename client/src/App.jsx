import React, { useEffect, useMemo, useRef, useState } from 'react';
import { renderMarkdown } from './markdown';

const EXAMPLES = [
  {
    label: 'Meal planner',
    text: 'An AI-powered meal planner for busy parents that builds weekly grocery lists from what’s already in the fridge, cuts food waste, and syncs with local supermarket delivery.',
  },
  {
    label: 'Clinic reminders',
    text: 'A B2B platform that helps small clinics manage patient reminders, no-show risk scores, and WhatsApp follow-ups without replacing their existing EHR.',
  },
  {
    label: 'Home services',
    text: 'A marketplace connecting homeowners with vetted local handypeople for same-week micro-jobs, with upfront pricing and photo-verified completion.',
  },
];

export default function App() {
  const [idea, setIdea] = useState('');
  const [mode, setMode] = useState('…');
  const [roster, setRoster] = useState([]);
  const [running, setRunning] = useState(false);
  const [activeId, setActiveId] = useState(null);
  const [turns, setTurns] = useState([]);
  const [error, setError] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const abortRef = useRef(null);
  const feedRef = useRef(null);

  useEffect(() => {
    fetch('/api/health')
      .then((r) => r.json())
      .then((d) => {
        setMode(d.mode || 'demo');
        setRoster(d.agents || []);
      })
      .catch(() => setMode('offline'));
  }, []);

  useEffect(() => {
    feedRef.current?.scrollTo({ top: feedRef.current.scrollHeight, behavior: 'smooth' });
  }, [turns, activeId]);

  const selectedTurn = useMemo(() => {
    if (!turns.length) return null;
    const id = selectedId || turns[turns.length - 1].id;
    return turns.find((t) => t.id === id) || turns[turns.length - 1];
  }, [turns, selectedId]);

  const finalPlan = turns.find((t) => t.id === 'synthesis') || null;

  async function runPlan(e) {
    e?.preventDefault();
    setError('');
    setTurns([]);
    setSelectedId(null);
    setActiveId(null);
    setRunning(true);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch('/api/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idea, stream: true }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || `Request failed (${res.status})`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const parts = buffer.split('\n\n');
        buffer = parts.pop() || '';

        for (const chunk of parts) {
          const lines = chunk.split('\n');
          let event = 'message';
          let dataLine = '';
          for (const line of lines) {
            if (line.startsWith('event:')) event = line.slice(6).trim();
            if (line.startsWith('data:')) dataLine += line.slice(5).trim();
          }
          if (!dataLine) continue;
          const data = JSON.parse(dataLine);

          if (event === 'meta') setMode(data.mode);
          if (event === 'agent_start') setActiveId(data.id);
          if (event === 'agent_done') {
            setTurns((prev) => [...prev, data.turn]);
            setSelectedId(data.turn.id);
            setActiveId(null);
          }
          if (event === 'error') throw new Error(data.message || 'Stream error');
        }
      }
    } catch (err) {
      if (err.name !== 'AbortError') setError(err.message || 'Something went wrong');
    } finally {
      setRunning(false);
      setActiveId(null);
      abortRef.current = null;
    }
  }

  function stop() {
    abortRef.current?.abort();
  }

  function downloadPlan() {
    if (!finalPlan) return;
    const blob = new Blob([finalPlan.content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'business-plan.md';
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="page">
      <header className="hero">
        <p className="brand">Boardroom</p>
        <h1>Multi-agent business assistant</h1>
        <p className="lede">
          Describe your idea. Four specialists — CEO, Marketing Manager, Financial Analyst, and
          Software Engineer — collaborate in sequence, then the CEO ships a unified business plan.
        </p>
        {mode === 'openai' ? (
          <p className="mode-pill mode-pill--openai">Live AI: OpenAI (GPT)</p>
        ) : null}
      </header>

      <section className="roster" aria-label="Advisory board">
        {(roster.length
          ? roster
          : [
              { id: 'ceo', name: 'CEO', title: 'Chief Executive Officer', color: '#0f766e' },
              { id: 'marketing', name: 'Marketing Manager', title: 'Marketing Manager', color: '#b45309' },
              { id: 'finance', name: 'Financial Analyst', title: 'Financial Analyst', color: '#1d4ed8' },
              { id: 'engineer', name: 'Software Engineer', title: 'Software Engineer', color: '#7c3aed' },
            ]
        ).map((a) => (
          <article
            key={a.id}
            className={`roster-card ${activeId === a.id ? 'is-speaking' : ''} ${
              turns.some((t) => t.id === a.id) ? 'is-done' : ''
            }`}
            style={{ '--agent': a.color }}
          >
            <span className="roster-dot" />
            <div>
              <h2>{a.name}</h2>
              <p>{a.title}</p>
            </div>
          </article>
        ))}
      </section>

      <form className="compose" onSubmit={runPlan}>
        <label htmlFor="idea">Your business idea</label>
        <textarea
          id="idea"
          rows={5}
          value={idea}
          onChange={(e) => setIdea(e.target.value)}
          placeholder="Who is it for, what problem do you solve, and how might you make money?"
          disabled={running}
          required
        />
        <div className="compose-actions">
          <div className="examples">
            {EXAMPLES.map((ex) => (
              <button
                key={ex.label}
                type="button"
                className="chip"
                disabled={running}
                onClick={() => setIdea(ex.text)}
              >
                {ex.label}
              </button>
            ))}
          </div>
          <div className="compose-btns">
            {running ? (
              <button type="button" className="btn btn--ghost" onClick={stop}>
                Stop
              </button>
            ) : null}
            <button type="submit" className="btn" disabled={running || idea.trim().length < 20}>
              {running ? 'Agents collaborating…' : 'Convene the board'}
            </button>
          </div>
        </div>
        {error ? <p className="error">{error}</p> : null}
      </form>

      {(running || turns.length > 0) && (
        <div className="workspace">
          <aside className="timeline" ref={feedRef}>
            <h2>Collaboration log</h2>
            {turns.map((t) => (
              <button
                key={t.id}
                type="button"
                className={`timeline-item ${selectedTurn?.id === t.id ? 'is-active' : ''}`}
                style={{ '--agent': t.color }}
                onClick={() => setSelectedId(t.id)}
              >
                <strong>{t.title}</strong>
                <span>{t.focus}</span>
              </button>
            ))}
            {activeId ? (
              <div className="timeline-item is-typing" style={{ '--agent': '#64748b' }}>
                <strong>Thinking…</strong>
                <span>Agent is writing their section</span>
              </div>
            ) : null}
          </aside>

          <article className="panel">
            {selectedTurn ? (
              <>
                <header className="panel-head" style={{ borderColor: selectedTurn.color }}>
                  <div>
                    <p className="eyebrow">{selectedTurn.name}</p>
                    <h2>{selectedTurn.title}</h2>
                  </div>
                  {selectedTurn.id === 'synthesis' ? (
                    <button type="button" className="btn btn--ghost" onClick={downloadPlan}>
                      Download plan
                    </button>
                  ) : null}
                </header>
                <div
                  className="md"
                  dangerouslySetInnerHTML={{ __html: renderMarkdown(selectedTurn.content) }}
                />
              </>
            ) : (
              <p className="panel-empty">Waiting for the first agent…</p>
            )}
          </article>
        </div>
      )}

      <footer className="foot">
        <p>Pipeline: CEO → Marketing → Finance → Engineering → CEO synthesis.</p>
      </footer>
    </div>
  );
}
