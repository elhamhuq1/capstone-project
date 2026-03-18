'use client';

interface InstructionsScreenProps {
  group: string;
  onBegin: () => void;
}

function GroupSpecificNote({ group }: { group: string }) {
  switch (group) {
    case 'single-shot':
      return (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
          You will have <strong>one opportunity</strong> to ask the AI for
          assistance per sample.
        </p>
      );
    case 'iterative':
      return (
        <p className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800 dark:border-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
          You can ask the AI for assistance{' '}
          <strong>as many times as you like</strong> per sample.
        </p>
      );
    case 'scaffold':
      return (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
          You can ask the AI for assistance{' '}
          <strong>as many times as you like</strong> per sample. A helpful guide
          will be available during the task.
        </p>
      );
    default:
      return null;
  }
}

export default function InstructionsScreen({
  group,
  onBegin,
}: InstructionsScreenProps) {
  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <div className="space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">
            Study Instructions
          </h1>
          <p className="mt-2 text-zinc-600 dark:text-zinc-400">
            Please read the following before you begin.
          </p>
        </div>

        <div className="space-y-4 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            What you&apos;ll be doing
          </h2>

          <ul className="space-y-3 text-zinc-700 dark:text-zinc-300">
            <li className="flex items-start gap-3">
              <span className="mt-1 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                1
              </span>
              <span>
                You will revise <strong>3 writing samples</strong> with the help
                of an AI assistant.
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="mt-1 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                2
              </span>
              <span>
                Edit the text <strong>directly in the editor</strong>.
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="mt-1 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                3
              </span>
              <span>
                You can ask the AI for help using the{' '}
                <strong>chat panel</strong>.
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="mt-1 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                4
              </span>
              <span>
                Take your time — there is <strong>no time limit</strong>.
              </span>
            </li>
          </ul>
        </div>

        <GroupSpecificNote group={group} />

        <div className="text-center">
          <button
            onClick={onBegin}
            className="rounded-lg bg-blue-600 px-8 py-3 text-base font-semibold text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:ring-offset-2 dark:bg-blue-500 dark:hover:bg-blue-600 dark:focus:ring-offset-zinc-900"
          >
            Begin
          </button>
        </div>
      </div>
    </div>
  );
}
