import Link from 'next/link';

interface CompletionScreenProps {
  sessionId: string;
}

export default function CompletionScreen({ sessionId }: CompletionScreenProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-stone-50 p-6 dark:bg-zinc-950">
      <div className="w-full max-w-md text-center">
        {/* Checkmark icon */}
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
          <svg
            className="h-8 w-8 text-emerald-600 dark:text-emerald-400"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4.5 12.75l6 6 9-13.5"
            />
          </svg>
        </div>

        <h1 className="text-2xl font-bold text-stone-900 dark:text-zinc-100">
          Thank you for completing the study!
        </h1>
        <p className="mt-3 text-stone-600 dark:text-zinc-400">
          You have completed all 3 writing samples and surveys. Your responses
          have been saved.
        </p>

        {/* Session ID box */}
        <div className="mt-6 rounded-lg border border-stone-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-xs text-stone-400 dark:text-zinc-500">
            Your session ID
          </p>
          <p className="mt-1 font-mono text-sm text-stone-700 dark:text-zinc-300">
            {sessionId}
          </p>
        </div>

        <Link
          href="/register"
          className="mt-8 inline-block rounded-lg border border-stone-300 bg-white px-6 py-2.5 text-sm font-medium text-stone-700 shadow-sm transition-all hover:bg-stone-50 hover:shadow dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
        >
          Return to Home
        </Link>
      </div>
    </div>
  );
}
