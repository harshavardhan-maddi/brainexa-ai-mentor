// Simple in-memory store for demo (will be replaced with Lovable Cloud)
import { useState, useEffect, useCallback } from "react";
import { API_BASE_URL } from "./api-config";


export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  password?: string;
  plan: "free" | "premium";
  createdAt: string;
  profilePicture?: string;
  studyStartDate?: string;
  studyEndDate?: string;
  syllabusUpdateCount: number;
  syllabusUpdateAllowance: number;
  rulesAccepted: boolean;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  userName?: string;
  imageUrl?: string;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
}

export interface SubjectTopic {
  topic: string;
  questionsAttempted: number;
  questionsCorrect: number;
}

export interface StudentSubject {
  subject: string;
  topics: SubjectTopic[];
  currentTopicIndex: number;
}

export interface QuizResult {
  id: string;
  subject: string;
  topic: string;
  score: number;
  total: number;
  date: string;
  weakTopics: string[];
}

export interface StudyPlanDay {
  day: number;
  date?: string;
  tasks: { subject: string; topic: string }[];
}

export interface LearningMaterial {
  id: string;
  title: string;
  subject: string;
  type: "generated" | "uploaded";
  format: "pdf" | "notes" | "link";
  content: string;
  createdAt: string;
}

const STORAGE_KEY = "brainexa_data";

interface AppData {
  user: User | null;
  chatHistory: ChatMessage[];
  chatSessions: ChatSession[];
  currentSessionId: string | null;
  quizResults: QuizResult[];
  studyPlan: StudyPlanDay[];
  studyProgress: number;
  studentSubjects: StudentSubject[];
  completedTasks: string[];
  learningMaterials: LearningMaterial[];
}

const defaultData: AppData = {
  user: null,
  chatHistory: [],
  chatSessions: [],
  currentSessionId: null,
  quizResults: [],
  studyPlan: [],
  studyProgress: 0,
  studentSubjects: [],
  completedTasks: [],
  learningMaterials: [],
};

function loadData(): AppData {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    const parsed = saved ? JSON.parse(saved) : {};
    return { ...defaultData, ...parsed };
  } catch {
    return defaultData;
  }
}

function saveData(data: AppData) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

// Global state with listeners
let state = loadData();
const listeners = new Set<() => void>();

function notify() {
  saveData(state);
  listeners.forEach((l) => l());
}

function generateSessionTitle(messages: ChatMessage[]): string {
  const first = messages.find(m => m.role === "user");
  if (!first) return "New Chat";
  return first.content.substring(0, 40) + (first.content.length > 40 ? "..." : "");
}

export function useStore() {
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    if (state.user?.id) {
      fetchUserData(state.user.id);
    }
  }, [state.user?.id]);

  useEffect(() => {
    const listener = () => forceUpdate((n) => n + 1);
    listeners.add(listener);
    return () => { listeners.delete(listener); };
  }, []);

  const login = useCallback((user: User, data?: any) => {
    if (data) {
      state = {
        ...state,
        user,
        chatHistory: data.chatHistory || [],
        quizResults: data.quizResults || [],
        studyPlan: data.studyPlan || [],
        studyProgress: data.studyProgress || 0,
        studentSubjects: data.subjects || [],
        syllabusUpdateCount: user.syllabusUpdateCount || 0,
        syllabusUpdateAllowance: user.syllabusUpdateAllowance || 5,
        rulesAccepted: user.rulesAccepted || false
      };
    } else {
      state = { ...state, user };
    }
    notify();
  }, []);

  const logout = useCallback(async () => {
    if (state.user) {
      try {
        await fetch(`${API_BASE_URL}/api/auth/logout`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: state.user.id })
        });
      } catch (e) {
        console.error("Failed to log logout activity", e);
      }
    }
    state = defaultData;
    notify();
  }, []);

  const updateUser = useCallback((updates: Partial<User>) => {
    if (state.user) {
      state = { ...state, user: { ...state.user, ...updates } };
      notify();
    }
  }, []);

  const updatePlan = useCallback(async (plan: "free" | "premium") => {
    if (state.user) {
      state = { ...state, user: { ...state.user, plan } };
      notify();
      
      try {
        await fetch(`${API_BASE_URL}/api/update-plan`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: state.user.id, plan })
        });
      } catch (e) {
        console.error("Failed to sync plan update", e);
      }
    }
  }, []);

  const addChat = useCallback((msg: ChatMessage) => {
    state = { ...state, chatHistory: [...state.chatHistory, msg] };

    if (state.currentSessionId) {
      const sessions = state.chatSessions.map(s => {
        if (s.id === state.currentSessionId) {
          const updated = { ...s, messages: [...s.messages, msg], updatedAt: new Date().toISOString() };
          updated.title = generateSessionTitle(updated.messages);
          return updated;
        }
        return s;
      });
      state = { ...state, chatSessions: sessions };
    } else {
      const newSession: ChatSession = {
        id: crypto.randomUUID(),
        title: generateSessionTitle([msg]),
        messages: [msg],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      state = {
        ...state,
        chatSessions: [newSession, ...state.chatSessions],
        currentSessionId: newSession.id,
      };
    }
    notify();
  }, []);

  const createNewSession = useCallback(() => {
    state = { ...state, currentSessionId: null, chatHistory: [] };
    notify();
  }, []);

  const switchSession = useCallback((sessionId: string) => {
    const session = state.chatSessions.find(s => s.id === sessionId);
    if (session) {
      state = {
        ...state,
        currentSessionId: sessionId,
        chatHistory: session.messages,
      };
      notify();
    }
  }, []);

  const deleteSession = useCallback((sessionId: string) => {
    const sessions = state.chatSessions.filter(s => s.id !== sessionId);
    const isCurrent = state.currentSessionId === sessionId;
    state = {
      ...state,
      chatSessions: sessions,
      currentSessionId: isCurrent ? null : state.currentSessionId,
      chatHistory: isCurrent ? [] : state.chatHistory,
    };
    notify();
  }, []);

  const addQuizResult = useCallback(async (result: QuizResult) => {
    state = { ...state, quizResults: [...state.quizResults, result] };
    notify();
    if (state.user) {
      try {
        await fetch(`${API_BASE_URL}/api/save-quiz-result`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: state.user.id, result })
        });
      } catch (e) {
        console.error("Failed to sync quiz result", e);
      }
    }
  }, []);

  const setStudyPlan = useCallback(async (plan: StudyPlanDay[], startDate?: string, endDate?: string) => {
    state = { ...state, studyPlan: plan };
    if (startDate && endDate) {
      state = { ...state, user: state.user ? { ...state.user, studyStartDate: startDate, studyEndDate: endDate } : null };
    }
    notify();
    if (state.user) {
      try {
        const res = await fetch(`${API_BASE_URL}/api/save-study-plan`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: state.user.id, plan, startDate, endDate })
        });
        const data = await res.json();
        if (data.success && data.studyStartDate) {
          updateUser({ studyStartDate: data.studyStartDate, studyEndDate: data.studyEndDate });
        }
      } catch (e) {
        console.error("Failed to sync study plan", e);
      }
    }
  }, []);

  const updateProgress = useCallback(async (progress: number) => {
    state = { ...state, studyProgress: progress };
    notify();
    if (state.user) {
      try {
        await fetch(`${API_BASE_URL}/api/update-progress`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: state.user.id, progress })
        });
      } catch (e) {
        console.error("Failed to sync progress", e);
      }
    }
  }, []);

  const logTask = useCallback(async (subject: string, topic: string) => {
    if (state.user) {
      try {
        await fetch(`${API_BASE_URL}/api/log-task`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: state.user.id, subject, topic })
        });
      } catch (e) {
        console.error("Failed to log task activity", e);
      }
    }
  }, []);

  const setCompletedTasks = useCallback((tasks: string[]) => {
    state = { ...state, completedTasks: tasks };
    notify();
  }, []);

  const setStudentSubjects = useCallback(async (subjects: StudentSubject[], isModified: boolean = false, paidAmount?: number) => {
    state = { ...state, studentSubjects: subjects };
    notify();
    if (state.user) {
      try {
        const res = await fetch(`${API_BASE_URL}/api/update-subjects`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: state.user.id, subjects, isModified, paidAmount })
        });
        const data = await res.json();
        if (data.success) {
          updateUser({ 
            syllabusUpdateCount: data.syllabusUpdateCount,
            syllabusUpdateAllowance: data.syllabusUpdateAllowance
          });
        }
        return data;
      } catch (e) {
        console.error("Failed to sync subjects", e);
        return { success: false, error: "Network error" };
      }
    }
    return { success: false, error: "No user" };
  }, []);

  const acceptRules = useCallback(async () => {
    if (state.user) {
      updateUser({ rulesAccepted: true });
      try {
        await fetch(`${API_BASE_URL}/api/user/accept-rules`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: state.user.id })
        });
      } catch (e) {
        console.error("Failed to sync rules acceptance", e);
      }
    }
  }, []);

  const updateStudentSubject = useCallback((subjectName: string, topics: SubjectTopic[], currentTopicIndex: number) => {
    const existingIndex = state.studentSubjects.findIndex(s => s.subject === subjectName);
    if (existingIndex >= 0) {
      const updated = [...state.studentSubjects];
      updated[existingIndex] = { subject: subjectName, topics, currentTopicIndex };
      state = { ...state, studentSubjects: updated };
    } else {
      state = { ...state, studentSubjects: [...state.studentSubjects, { subject: subjectName, topics, currentTopicIndex }] };
    }
    notify();
  }, []);

  const fetchUserData = useCallback(async (userId: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/user-data/${userId}`);
      if (!res.ok) throw new Error('Failed to fetch user data');
      const { data, user: freshUser } = await res.json();
      if (data) {
        state = {
          ...state,
          user: freshUser ? { ...state.user, ...freshUser } : state.user,
          chatHistory: data.chatHistory || [],
          quizResults: data.quizResults || [],
          studyPlan: data.studyPlan || [],
          studyProgress: data.studyProgress || 0,
          studentSubjects: data.subjects || [],
          learningMaterials: data.learningMaterials || [],
        };
        notify();
      }
    } catch (error) {
      console.error('Failed to fetch user data:', error);
    }
  }, []);

  const getStudentSubject = useCallback((subjectName: string) => {
    return state.studentSubjects.find(s => s.subject === subjectName);
  }, []);

  return {
    user: state.user,
    chatHistory: state.chatHistory,
    chatSessions: state.chatSessions,
    currentSessionId: state.currentSessionId,
    quizResults: state.quizResults,
    studyPlan: state.studyPlan,
    studyProgress: state.studyProgress,
    studentSubjects: state.studentSubjects,
    completedTasks: state.completedTasks,
    learningMaterials: state.learningMaterials || [],
    login,
    logout,
    updateUser,
    updatePlan,
    addChat,
    addQuizResult,
    setStudyPlan,
    updateProgress,
    logTask,
    setCompletedTasks,
    setStudentSubjects,
    updateStudentSubject,
    getStudentSubject,
    fetchUserData,
    acceptRules,
    createNewSession,
    switchSession,
    deleteSession,
    addLearningMaterial: useCallback(async (material: LearningMaterial) => {
      const current = Array.isArray(state.learningMaterials) ? state.learningMaterials : [];
      state = { ...state, learningMaterials: [material, ...current] };
      notify();
      console.log('📚 Material added to local store:', material.title);
      if (state.user) {
        try {
          await fetch(`${API_BASE_URL}/api/save-material`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: state.user.id, material })
          });
        } catch (e) { console.error("Failed to sync material", e); }
      }
    }, []),
    removeLearningMaterial: useCallback(async (id: string) => {
      state = { ...state, learningMaterials: state.learningMaterials.filter(m => m.id !== id) };
      notify();
    }, []),
  };
}
