// Database field names to display names mapping
export const DB_FIELD_TO_DISPLAY_NAME = {
  problemDecomposition: 'Problem Decomposition',
  debuggingReasoning: 'Debugging and Reasoning',
  conceptUnderstanding: 'Concept Understanding',
  aiLearningEffectiveness: 'AI Learning Effectiveness',
  taskCompletion: 'Task Completion',
  basicSyntaxUsage: 'Basic Syntax Usage',
  effortParticipation: 'Effort and Participation',
  codeClarityCleanliness: 'Code Clarity and Cleanliness'
} as const;

// Display names to database field names mapping
export const DISPLAY_NAME_TO_DB_FIELD = {
  'Problem Decomposition': 'problemDecomposition',
  'Debugging and Reasoning': 'debuggingReasoning',
  'Concept Understanding': 'conceptUnderstanding',
  'AI Learning Effectiveness': 'aiLearningEffectiveness',
  'Task Completion': 'taskCompletion',
  'Basic Syntax Usage': 'basicSyntaxUsage',
  'Effort and Participation': 'effortParticipation',
  'Code Clarity and Cleanliness': 'codeClarityCleanliness'
} as const;

// Parse function - convert database field names to display names
export function parseEvaluationFields(evaluationData: any) {
  if (!evaluationData) return evaluationData;
  
  // Process breakdown array
  if (evaluationData.breakdown && Array.isArray(evaluationData.breakdown)) {
    return {
      ...evaluationData,
      breakdown: evaluationData.breakdown.map((item: any) => ({
        ...item,
        skill: DB_FIELD_TO_DISPLAY_NAME[item.skill as keyof typeof DB_FIELD_TO_DISPLAY_NAME] || item.skill
      }))
    };
  }
  
  return evaluationData;
}

// Reverse parse function - convert display names to database field names (for data submission)
export function parseEvaluationFieldsToDb(evaluationData: any) {
  if (!evaluationData) return evaluationData;
  
  // Process breakdown array
  if (evaluationData.breakdown && Array.isArray(evaluationData.breakdown)) {
    return {
      ...evaluationData,
      breakdown: evaluationData.breakdown.map((item: any) => ({
        ...item,
        skill: DISPLAY_NAME_TO_DB_FIELD[item.skill as keyof typeof DISPLAY_NAME_TO_DB_FIELD] || item.skill
      }))
    };
  }
  
  return evaluationData;
}

// Parse teacherScores object - convert display names to database field names
export function parseTeacherScoresToDb(scores: Record<string, number>) {
  const dbScores: Record<string, number> = {};
  
  Object.entries(scores).forEach(([key, value]) => {
    const dbKey = DISPLAY_NAME_TO_DB_FIELD[key as keyof typeof DISPLAY_NAME_TO_DB_FIELD] || key;
    dbScores[dbKey] = value;
  });
  
  return dbScores;
}

export function parseTeacherCommentsToDb(comments: Record<string, string>) {
  const dbComments: Record<string, string> = {};
  for (const [key, value] of Object.entries(comments)) {
    const dbKey = `${DISPLAY_NAME_TO_DB_FIELD[key.replace('_comment', '') as keyof typeof DISPLAY_NAME_TO_DB_FIELD]}_comment`;
    dbComments[dbKey] = value;
  }
  return dbComments;
}
