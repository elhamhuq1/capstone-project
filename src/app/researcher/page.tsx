'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

interface Session {
  sessionId: string;
  participantName: string;
  participantEmail: string;
  group: string;
  status: string;
  samplesCompleted: number;
  totalPrompts: number;
  totalTimeSeconds: number;
  startedAt: string;
  completedAt: string | null;
}

const GROUP_FILTERS = [
  { label: 'All', value: '' },
  { label: 'Single-Shot', value: 'single-shot' },
  { label: 'Iterative', value: 'iterative' },
  { label: 'Scaffold', value: 'scaffold' },
] as const;

const GROUP_COLORS: Record<string, string> = {
  'single-shot':
    'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  iterative:
    'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300',
  scaffold:
    'bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-300',
};

const STATUS_COLORS: Record<string, string> = {
  active:
    'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
  completed:
    'bg-stone-100 text-stone-700 dark:bg-zinc-700/40 dark:text-zinc-300',
  abandoned:
    'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
};

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function ResearcherPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeFilter, setActiveFilter] = useState('');

  const fetchSessions = useCallback(async (group: string) => {
    setLoading(true);
    setError('');
    try {
      const url = group
        ? `/api/researcher/sessions?group=${group}`
        : '/api/researcher/sessions';
      const res = await fetch(url);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      const data: Session[] = await res.json();
      setSessions(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load sessions');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSessions(activeFilter);
  }, [activeFilter, fetchSessions]);

  function handleFilter(value: string) {
    setActiveFilter(value);
  }

  return (
    <div>
      {/* Filter bar */}
      <div className="mb-6 flex flex-wrap items-center gap-2">
        <span className="mr-1 text-xs font-semibold uppercase tracking-wider text-stone-400 dark:text-zinc-500">
          Group
        </span>
        {GROUP_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => handleFilter(f.value)}
            className={`rounded-lg px-3.5 py-1.5 text-sm font-medium transition-all ${
              activeFilter === f.value
                ? 'bg-stone-900 text-white shadow-sm dark:bg-zinc-100 dark:text-zinc-900'
                : 'bg-white text-stone-600 border border-stone-200 hover:border-stone-400 hover:text-stone-900 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700 dark:hover:text-zinc-200 dark:hover:border-zinc-500'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Loading state */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-stone-300 border-t-stone-800 dark:border-zinc-600 dark:border-t-zinc-200" />
          <span className="ml-3 text-sm text-stone-500 dark:text-zinc-400">
            Loading sessions…
          </span>
        </div>
      )}

      {/* Error state */}
      {error && !loading && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-6 py-5 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && sessions.length === 0 && (
        <div className="rounded-xl border border-dashed border-stone-300 bg-white px-6 py-16 text-center dark:border-zinc-700 dark:bg-zinc-900">
          <p className="text-sm text-stone-500 dark:text-zinc-400">
            No sessions found
            {activeFilter && (
              <span>
                {' '}for group <strong>{activeFilter}</strong>
              </span>
            )}
            .
          </p>
        </div>
      )}

      {/* Session table */}
      {!loading && !error && sessions.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-stone-200 bg-stone-50 dark:border-zinc-800 dark:bg-zinc-800/60">
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-stone-500 dark:text-zinc-400">
                    Participant
                  </th>
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-stone-500 dark:text-zinc-400">
                    Email
                  </th>
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-stone-500 dark:text-zinc-400">
                    Group
                  </th>
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-stone-500 dark:text-zinc-400">
                    Status
                  </th>
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-stone-500 dark:text-zinc-400">
                    Samples
                  </th>
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-stone-500 dark:text-zinc-400">
                    Started
                  </th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((s, idx) => (
                  <tr
                    key={s.sessionId}
                    className={`border-b border-stone-100 transition-colors hover:bg-stone-50 dark:border-zinc-800/50 dark:hover:bg-zinc-800/40 ${
                      idx % 2 === 1
                        ? 'bg-stone-50/50 dark:bg-zinc-800/20'
                        : ''
                    }`}
                  >
                    <td className="px-5 py-3.5">
                      <Link
                        href={`/researcher/${s.sessionId}`}
                        className="font-medium text-stone-900 underline-offset-2 hover:underline dark:text-zinc-100"
                      >
                        {s.participantName}
                      </Link>
                    </td>
                    <td className="px-5 py-3.5 text-stone-500 dark:text-zinc-400">
                      {s.participantEmail}
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          GROUP_COLORS[s.group] ??
                          'bg-stone-100 text-stone-600 dark:bg-zinc-700 dark:text-zinc-300'
                        }`}
                      >
                        {s.group}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          STATUS_COLORS[s.status] ??
                          'bg-stone-100 text-stone-600 dark:bg-zinc-700 dark:text-zinc-300'
                        }`}
                      >
                        {s.status}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 font-mono text-xs text-stone-600 dark:text-zinc-400">
                      {s.samplesCompleted}/3
                    </td>
                    <td className="px-5 py-3.5 text-stone-500 dark:text-zinc-400">
                      {formatDate(s.startedAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Summary row */}
          <div className="border-t border-stone-200 bg-stone-50 px-5 py-2.5 text-xs text-stone-500 dark:border-zinc-800 dark:bg-zinc-800/60 dark:text-zinc-500">
            {sessions.length} session{sessions.length !== 1 && 's'} total
          </div>
        </div>
      )}
    </div>
  );
}
