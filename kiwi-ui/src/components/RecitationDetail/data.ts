export interface Annotation {
    skill: 'Problem Decomposition' | 'Debugging and Reasoning' | 'Concept Understanding' | 'AI Learning Effectiveness' | 'Task Completion' | 'Basic Syntax Usage' | 'Effort and Participation' | 'Code Clarity and Cleanliness';
    justification: string;
    teacherFeedback?: 'fair' | 'unfair';
    teacherComment?: string;
}

export interface ChatMessage {
    id: string;
    sender: 'user' | 'bot';
    text: string;
    annotation?: Annotation;
}

export interface TestCase {
    id: string;
    inputs: string;
    expectedOutput: string;
    actualOutput?: string;
    passed: boolean;
}

export interface Submission {
    id: string;
    timestamp: string;
    code: string;
    isCorrect: boolean;
    testCases: TestCase[];
    executionTime?: string;
    memoryUsage?: string;
}

export interface AIScore {
    overall: number; // out of 24 (8 dimensions * 3 points each)
    summary: string;
    breakdown: {
        skill: string;
        score: number;
        teacherScore?: number;  // Added for teacher correction
        teacherComment?: string; // Added for teacher feedback
    }[];
    teacherOverall?: number;    // Added for teacher correction
    teacherComment?: string;    // Added for teacher feedback
}

export interface ProblemPerformance {
    problemId: string;
    problemTitle: string;
    submissions: Submission[];
    chatHistory: ChatMessage[];
    aiScore: AIScore;
}

export interface StudentOverallPerformance {
    overallScore: number;
    summary: string;
    skillBreakdown: {
        skill: string;
        score: number;
    }[];
    strengths: string[];
    areasForImprovement: string[];
}

export interface Student {
    id: string;
    name: string;
    performances: ProblemPerformance[];
    overallPerformance: StudentOverallPerformance;
}

export interface ClassData {
    classId: string;
    className: string;
    recitationTitle: string;
    recitationDate: string;
    students: Student[];
}