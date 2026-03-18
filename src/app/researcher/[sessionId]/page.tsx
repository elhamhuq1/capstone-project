'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

/* ---------- types ---------- */
interface PromptEntry {
  id: number;
  content: string;
  promptNumber: number;
  createdAt: string;
  aiResponse: string | null;
}

interface Revision {
  id: number;
  revisionNumber: number;
  content: string;
  createdAt: string;
}

interface SampleDetail {
  sampleId: number;
  sampleIndex: number;
  title: string | null;
  content: string | null;
  prompts: PromptEntry[];
  revisions: Revision[];
  survey: Record<string, number>;
  timing: {
    startedAt: string | null;
    completedAt: string | null;
    timeSeconds: number | null;
  };
}

interface SessionDetail {
  sessionId: string;
  participant: { name: string | null; email: string | null };
  group: string;
  status: string;
  sampleOrder: number[];
  startedAt: string;
  completedAt: string | null;
  samples: SampleDetail[];
}

/* ---------- palette ---------- */
const GROUP_BADGE: Record<string, string> = {
  'single-shot':
    'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  iterative:
    'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300',
  scaffold:
    'bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-300',
};

const STATUS_BADGE: Record<string, string> = {
  active:
    'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
  completed:
    'bg-stone-100 text-stone-700 dark:bg-zinc-700/40 dark:text-zinc-300',
  abandoned:
    'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
};

const SURVEY_LABELS: Record<string, string> = {
  authorship: 'Ownership',
  satisfaction: 'Satisfaction',
  cognitive_load: 'Cognitive Load',
  helpfulness: 'Helpfulness',
  future_intent: 'Future Intent',
};

/* ---------- helpers ---------- */
function fmtDate(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function fmtDuration(sec: number | null) {
  if (sec === null) return '—';
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

/* ---------- collapsible ---------- */
function Collapsible({
  title,
  count,
  children,
  defaultOpen = false,
}: {
  title: string;
  count?: number;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-lg border border-stone-200 dark:border-zinc-700">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-4 py-2.5 text-left text-sm font-medium text-stone-700 transition-colors hover:bg-stone-50 dark:text-zinc-300 dark:hover:bg-zinc-800"
      >
        <span>
          {title}
          {count !== undefined && (
            <span className="ml-1.5 text-stone-400 dark:text-zinc-500">
              ({count})
            </span>
          )}
        </span>
        <svg
          className={`h-4 w-4 text-stone-400 transition-transform dark:text-zinc-500 ${
            open ? 'rotate-180' : ''
          }`}
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {open && (
        <div className="border-t border-stone-200 px-4 py-3 dark:border-zinc-700">
          {children}
        </div>
      )}
    </div>
  );
}

/* ---------- truncated text ---------- */
function TruncatedText({
  text,
  maxLen = 300,
}: {
  text: string;
  maxLen?: number;
}) {
  const [expanded, setExpanded] = useState(false);
  if (text.length <= maxLen) {
    return <span className="whitespace-pre-wrap">{text}</span>;
  }
  return (
    <span className="whitespace-pre-wrap">
      {expanded ? text : text.slice(0, maxLen) + '…'}
      <button
        onClick={() => setExpanded((e) => !e)}
        className="ml-1 text-xs font-medium text-blue-600 hover:underline dark:text-blue-400"
      >
        {expanded ? 'Show less' : 'Show more'}
      </button>
    </span>
  );
}

/* ========== page ========== */
export default function SessionDetailPage() {
  const params = useParams<{ sessionId: string }>();
  const sessionId = params.sessionId;

  const [detail, setDetail] = useState<SessionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError('');
      setNotFound(false);
      try {
        const res = await fetch(`/api/researcher/sessions/${sessionId}`);
        if (res.status === 404) {
          setNotFound(true);
          return;
        }
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || `HTTP ${res.status}`);
        }
        const data: SessionDetail = await res.json();
        setDetail(data);
      } catch (err: unknown) {
        setError(
          err instanceof Error ? err.message : 'Failed to load session',
        );
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [sessionId]);

  /* -- loading -- */
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-stone-300 border-t-stone-800 dark:border-zinc-600 dark:border-t-zinc-200" />
        <span className="ml-3 text-sm text-stone-500 dark:text-zinc-400">
          Loading session…
        </span>
      </div>
    );
  }

  /* -- 404 -- */
  if (notFound) {
    return (
      <div className="rounded-xl border border-dashed border-stone-300 bg-white px-6 py-16 text-center dark:border-zinc-700 dark:bg-zinc-900">
        <p className="text-lg font-semibold text-stone-700 dark:text-zinc-300">
          Session not found
        </p>
        <p className="mt-1 text-sm text-stone-500 dark:text-zinc-400">
          The session <code className="font-mono text-xs">{sessionId}</code>{' '}
          does not exist.
        </p>
        <Link
          href="/researcher"
          className="mt-4 inline-block text-sm font-medium text-blue-600 hover:underline dark:text-blue-400"
        >
          ← Back to sessions
        </Link>
      </div>
    );
  }

  /* -- error -- */
  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 px-6 py-5 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
        <strong>Error:</strong> {error}
      </div>
    );
  }

  if (!detail) return null;

  const { participant, group, status, startedAt, completedAt, samples } =
    detail;

  return (
    <div>
      {/* Back link */}
      <Link
        href="/researcher"
        className="mb-6 inline-block text-sm font-medium text-stone-400 transition-colors hover:text-stone-700 dark:text-zinc-500 dark:hover:text-zinc-300"
      >
        ← All sessions
      </Link>

      {/* Header card */}
      <div className="mb-8 rounded-xl border border-stone-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-stone-900 dark:text-zinc-100">
              {participant.name ?? 'Unknown'}
            </h2>
            <p className="mt-0.5 text-sm text-stone-500 dark:text-zinc-400">
              {participant.email ?? '—'}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                GROUP_BADGE[group] ??
                'bg-stone-100 text-stone-600 dark:bg-zinc-700 dark:text-zinc-300'
              }`}
            >
              {group}
            </span>
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                STATUS_BADGE[status] ??
                'bg-stone-100 text-stone-600 dark:bg-zinc-700 dark:text-zinc-300'
              }`}
            >
              {status}
            </span>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-x-8 gap-y-1 text-xs text-stone-500 dark:text-zinc-400">
          <span>
            <strong className="text-stone-600 dark:text-zinc-300">
              Started:
            </strong>{' '}
            {fmtDate(startedAt)}
          </span>
          <span>
            <strong className="text-stone-600 dark:text-zinc-300">
              Completed:
            </strong>{' '}
            {fmtDate(completedAt)}
          </span>
        </div>
      </div>

      {/* Per-sample cards */}
      <div className="space-y-6">
        {samples.map((sample, idx) => (
          <div
            key={sample.sampleId}
            className="rounded-xl border border-stone-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
          >
            {/* Sample header */}
            <div className="flex items-center justify-between border-b border-stone-200 px-6 py-4 dark:border-zinc-800">
              <div>
                <h3 className="text-sm font-bold text-stone-800 dark:text-zinc-200">
                  Sample {idx + 1}
                  {sample.title && (
                    <span className="ml-2 font-normal text-stone-500 dark:text-zinc-400">
                      — {sample.title}
                    </span>
                  )}
                </h3>
              </div>
              <span className="rounded-md bg-stone-100 px-2.5 py-1 text-xs font-mono text-stone-600 dark:bg-zinc-800 dark:text-zinc-400">
                {fmtDuration(sample.timing.timeSeconds)}
              </span>
            </div>

            {/* Collapsible sections */}
            <div className="space-y-3 p-4">
              {/* Prompts & AI Responses */}
              <Collapsible
                title="Prompts & AI Responses"
                count={sample.prompts.length}
                defaultOpen={idx === 0}
              >
                {sample.prompts.length === 0 ? (
                  <p className="text-xs italic text-stone-400 dark:text-zinc-500">
                    No prompts recorded.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {sample.prompts.map((p) => (
                      <div key={p.id}>
                        <div className="text-xs font-semibold text-stone-500 dark:text-zinc-400">
                          Prompt #{p.promptNumber}
                        </div>
                        <div className="mt-1 rounded-md bg-blue-50 px-3 py-2 text-sm text-stone-800 dark:bg-blue-900/20 dark:text-zinc-200">
                          <TruncatedText text={p.content} />
                        </div>
                        {p.aiResponse && (
                          <div className="mt-1.5 ml-3 rounded-md border-l-2 border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-stone-700 dark:border-emerald-700 dark:bg-emerald-900/20 dark:text-zinc-300">
                            <span className="mb-0.5 block text-[10px] font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                              AI Response
                            </span>
                            <TruncatedText text={p.aiResponse} maxLen={500} />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </Collapsible>

              {/* Revisions */}
              <Collapsible
                title="Revisions"
                count={sample.revisions.length}
              >
                {sample.revisions.length === 0 ? (
                  <p className="text-xs italic text-stone-400 dark:text-zinc-500">
                    No revisions recorded.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {sample.revisions.map((r) => (
                      <div
                        key={r.id}
                        className="rounded-md border border-stone-100 bg-stone-50/50 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800/40"
                      >
                        <div className="mb-1 flex items-center justify-between text-xs text-stone-400 dark:text-zinc-500">
                          <span className="font-semibold">
                            Rev #{r.revisionNumber}
                          </span>
                          <span>{fmtDate(r.createdAt)}</span>
                        </div>
                        <div className="text-sm text-stone-700 dark:text-zinc-300">
                          <TruncatedText text={r.content} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Collapsible>

              {/* Survey Ratings */}
              <Collapsible title="Survey Ratings">
                {Object.keys(sample.survey).length === 0 ? (
                  <p className="text-xs italic text-stone-400 dark:text-zinc-500">
                    No survey responses.
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(SURVEY_LABELS).map(([key, label]) => {
                      const val = sample.survey[key];
                      return (
                        <div
                          key={key}
                          className="flex items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-3 py-1.5 dark:border-zinc-700 dark:bg-zinc-800"
                        >
                          <span className="text-xs text-stone-500 dark:text-zinc-400">
                            {label}
                          </span>
                          <span className="rounded-md bg-stone-100 px-1.5 py-0.5 text-xs font-bold text-stone-700 dark:bg-zinc-700 dark:text-zinc-200">
                            {val !== undefined ? val : '—'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </Collapsible>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
