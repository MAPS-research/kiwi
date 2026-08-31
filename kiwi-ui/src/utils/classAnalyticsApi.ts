// Thin typed client for the class-analytics endpoints (backend:
// src/analytics/class-analytics.controller.ts). Hand-written like
// experimentApi.ts so it reuses the shared basePath and auth token without
// requiring an OpenAPI regeneration.

import { basePath } from "./api.ts";

export interface LectureStats {
  pdfId: string;
  fileName: string;
  materialType: string | null;
  sortIndex: number;
  questionCount: number;
  studentCount: number;
  lastActivity: string | null;
}

export interface WeeklyActivity {
  weekStart: string;
  questionCount: number;
}

export interface ClassOverview {
  classId: string;
  totalQuestions: number;
  activeStudents: number;
  lectureCount: number;
  lectures: LectureStats[];
  weeklyActivity: WeeklyActivity[];
}

export interface ChatGroup {
  key: string;
  label?: string;
  pdfId?: string;
  fileName?: string;
  pdfPage?: number | null;
  questionCount: number;
  lastActivity: string | null;
}

export interface ChatGroupsResponse {
  by: "student" | "page";
  groups: ChatGroup[];
}

export interface ChatEntry {
  id: string;
  student: string;
  studentKey: string;
  question: string;
  pdfId: string | null;
  pdfPage: number | null;
  timestamp: string;
  hasAnswer: boolean;
}

export interface ChatListResponse {
  total: number;
  offset: number;
  limit: number;
  chats: ChatEntry[];
}

export interface ChatAnswer {
  content: string;
  engine: string | null;
  timestamp: string;
}

export interface TopicPageRef {
  pdfId: string;
  pdfPage: number;
  count: number;
}

export interface TopicSummary {
  id: string;
  label: string;
  questionCount: number;
  studentCount: number;
  topPages: TopicPageRef[];
}

export interface IntentTopTopic {
  id: string;
  label: string;
  count: number;
}

export interface IntentSummary {
  id: string;
  label: string;
  questionCount: number;
  studentCount: number;
  topTopics: IntentTopTopic[];
}

export interface TopicsResponse {
  status: string;
  generating: boolean;
  updatedAt: string | null;
  questionCount: number;
  pendingNewQuestions: number;
  error: string | null;
  topics: TopicSummary[];
  intents: IntentSummary[];
}

export interface TopicQuestion {
  id: string;
  student: string;
  studentKey: string;
  question: string;
  pdfId: string | null;
  pdfPage: number | null;
  timestamp: string;
}

export interface TopicQuestionsResponse {
  topicId: string;
  label: string;
  questions: TopicQuestion[];
}

export interface TopicsStatus {
  status: string;
  questionCount: number;
  updatedAt: string | null;
  error: string | null;
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem("authToken");
  const response = await fetch(`${basePath}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers ?? {}),
    },
  });

  if (!response.ok) {
    let msg = response.statusText;
    try {
      const body = await response.json();
      msg = body?.message ?? body?.error ?? msg;
    } catch {
      // keep statusText
    }
    throw new Error(msg);
  }

  return (await response.json()) as T;
}

function query(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") search.set(key, String(value));
  }
  const s = search.toString();
  return s ? `?${s}` : "";
}

export const classAnalyticsApi = {
  getOverview: (classId: string) =>
    request<ClassOverview>(`/analytics/class/${classId}/overview`),

  getChatGroups: (classId: string, by: "student" | "page", lectureId?: string) =>
    request<ChatGroupsResponse>(
      `/analytics/class/${classId}/chat-groups${query({ by, lectureId })}`,
    ),

  getChats: (
    classId: string,
    options: {
      lectureId?: string;
      studentKey?: string;
      pdfPage?: number;
      offset?: number;
      limit?: number;
      order?: "asc" | "desc";
    } = {},
  ) =>
    request<ChatListResponse>(
      `/analytics/class/${classId}/chats${query(options)}`,
    ),

  getChatAnswer: (classId: string, interactionId: string) =>
    request<{ answers: ChatAnswer[] }>(
      `/analytics/class/${classId}/chats/${interactionId}/answer`,
    ),

  getTopics: (classId: string, lectureId?: string) =>
    request<TopicsResponse>(
      `/analytics/class/${classId}/topics${query({ lectureId })}`,
    ),

  getTopicQuestions: (classId: string, topicId: string, lectureId?: string) =>
    request<TopicQuestionsResponse>(
      `/analytics/class/${classId}/topics/${topicId}/questions${query({ lectureId })}`,
    ),

  getIntentQuestions: (classId: string, intentId: string, lectureId?: string) =>
    request<{ intentId: string; label: string; questions: TopicQuestion[] }>(
      `/analytics/class/${classId}/intents/${intentId}/questions${query({ lectureId })}`,
    ),

  getTopicsStatus: (classId: string) =>
    request<TopicsStatus>(`/analytics/class/${classId}/topics/status`),

  refreshTopics: (classId: string) =>
    request<{ status: string; message: string }>(
      `/analytics/class/${classId}/topics/refresh`,
      { method: "POST" },
    ),
};
