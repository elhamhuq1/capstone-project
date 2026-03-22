import { NextResponse } from 'next/server';
import { getExportData } from '@/lib/db/queries';

function escapeCSVField(value: string | number | null | undefined): string {
  const str = value == null ? '' : String(value);
  // Replace newlines with spaces, then wrap in double quotes with internal quotes escaped
  const cleaned = str.replace(/\r?\n/g, ' ');
  return `"${cleaned.replace(/"/g, '""')}"`;
}

const CSV_COLUMNS = [
  'session_id',
  'participant_name',
  'participant_email',
  'participant_created_at',
  'group',
  'sample_id',
  'sample_title',
  'sample_index',
  'sample_grammarly_score',
  'prompt_count',
  'total_prompt_chars',
  'prompts_text',
  'ai_responses_text',
  'revision_count',
  'final_revision_text',
  'time_seconds',
  'sample_started_at',
  'sample_completed_at',
  'survey_authorship',
  'survey_satisfaction',
  'survey_cognitive_load',
  'survey_helpfulness',
  'survey_future_intent',
  'final_content',
  'changes_summary',
  'session_status',
  'session_started_at',
  'session_completed_at',
] as const;

export async function GET() {
  try {
    const rows = await getExportData();

    // Build CSV header
    const header = CSV_COLUMNS.map((col) => escapeCSVField(col)).join(',');

    // Build CSV data rows
    const dataRows = rows.map((row) =>
      CSV_COLUMNS.map((col) => escapeCSVField(row[col])).join(','),
    );

    const csvString = [header, ...dataRows].join('\n');

    return new Response(csvString, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="study-export.csv"',
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[researcher/export] GET error:', message);
    return NextResponse.json(
      { error: `Failed to generate export: ${message}` },
      { status: 500 },
    );
  }
}
