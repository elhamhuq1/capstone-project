import { NextResponse } from 'next/server';
import { getExportData } from '@/lib/db/queries';

function escapeCSVField(value: string | number | Date | null | undefined): string {
  if (value instanceof Date) {
    return `"${value.toISOString()}"`;
  }
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
  // Per-task survey (11 items)
  'survey_calibration_prediction',
  'survey_ownership_personal',
  'survey_ownership_responsibility',
  'survey_ownership_connection',
  'survey_ownership_emotional',
  'survey_ownership_mine',
  'survey_ownership_contribution',
  'survey_ownership_proud',
  'survey_tlx_mental_demand',
  'survey_tlx_effort',
  'survey_tlx_frustration',
  // Pre-study self-efficacy (8 items)
  'pre_se_ideas',
  'pre_se_organize',
  'pre_se_express',
  'pre_se_grammar',
  'pre_se_structure',
  'pre_se_revise',
  'pre_se_focus',
  'pre_se_identify_errors',
  // Post-study self-efficacy (8 items)
  'post_se_ideas',
  'post_se_organize',
  'post_se_express',
  'post_se_grammar',
  'post_se_structure',
  'post_se_revise',
  'post_se_focus',
  'post_se_identify_errors',
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
