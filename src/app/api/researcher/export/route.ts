import { NextResponse } from 'next/server';
import { getExportData } from '@/lib/db/queries';

function escapeCSVField(value: string | number | null | undefined): string {
  const str = value == null ? '' : String(value);
  // Replace newlines with spaces, then wrap in double quotes with internal quotes escaped
  const cleaned = str.replace(/\r?\n/g, ' ');
  return `"${cleaned.replace(/"/g, '""')}"`;
}

const CSV_COLUMNS = [
  'participant_name',
  'participant_email',
  'group',
  'sample_id',
  'sample_title',
  'sample_index',
  'prompt_count',
  'total_prompt_chars',
  'revision_count',
  'time_seconds',
  'survey_authorship',
  'survey_satisfaction',
  'survey_cognitive_load',
  'survey_helpfulness',
  'survey_future_intent',
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
