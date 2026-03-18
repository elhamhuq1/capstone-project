export const SURVEY_QUESTIONS = [
  { id: 'authorship', text: 'I feel a sense of ownership over the final revised text.' },
  { id: 'satisfaction', text: 'I am satisfied with the quality of my revision.' },
  { id: 'cognitive_load', text: 'The revision process required significant mental effort.' },
  { id: 'helpfulness', text: 'The AI suggestions were helpful for improving the writing.' },
  { id: 'future_intent', text: 'I would use a similar AI-assisted process for future writing tasks.' },
] as const;

export type SurveyQuestionId = typeof SURVEY_QUESTIONS[number]['id'];
