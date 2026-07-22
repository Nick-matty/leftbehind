import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import * as Crypto from 'expo-crypto';
import { createSecureStorage } from '../utils/secureStore';
import { log } from '../utils/secureLog';
import { ASSISTANT_KNOWLEDGE_SEED } from '../data/assistantKnowledge';

function id() {
  try {
    return Crypto.randomUUID();
  } catch {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }
}

export interface AssistantMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  text: string;
  createdAt: string;
}

export interface KnowledgeFact {
  id: string;
  text: string;
  createdAt: string;
  /** Set when added via the hidden /dev/knowledge console */
  source: 'seed' | 'admin';
}

export interface AssistantReminder {
  id: string;
  text: string;
  dueAt: string;
  done: boolean;
}

/** Personal facts the assistant learns from the user (device + E2EE sync). */
export interface UserMemory {
  id: string;
  text: string;
  createdAt: string;
  updatedAt: string;
}

function seedFacts(): KnowledgeFact[] {
  return ASSISTANT_KNOWLEDGE_SEED.map((text, i) => ({
    id: `seed-${i}`,
    text,
    createdAt: new Date().toISOString(),
    source: 'seed' as const,
  }));
}

interface AssistantState {
  hasHydrated: boolean;
  messages: AssistantMessage[];
  knowledge: KnowledgeFact[];
  memories: UserMemory[];
  reminders: AssistantReminder[];
  voiceReplies: boolean;
  bubbleOpen: boolean;

  addMessage: (role: AssistantMessage['role'], text: string) => void;
  clearChat: () => void;
  /** Admin / backend only — never expose in the user-facing UI. */
  adminTeach: (fact: string) => void;
  adminRemoveFact: (id: string) => void;
  remember: (text: string) => void;
  forgetMatching: (query: string) => number;
  clearMemories: () => void;
  addReminder: (text: string, dueAt: string) => void;
  completeReminder: (id: string) => void;
  setVoiceReplies: (on: boolean) => void;
  setBubbleOpen: (open: boolean) => void;
  upcomingReminders: () => AssistantReminder[];
  syncSeedKnowledge: () => void;
}

export const useAssistantStore = create<AssistantState>()(
  persist(
    (set, get) => ({
      hasHydrated: false,
      messages: [
        {
          id: 'welcome',
          role: 'assistant',
          text: "Hi! I'm your personal LeftBehind companion. Tell me about yourself, ask for live weather when you're online, or say “remember that…” so I can learn your preferences. Tap the mic to talk.",
          createdAt: new Date().toISOString(),
        },
      ],
      knowledge: seedFacts(),
      memories: [],
      reminders: [],
      voiceReplies: true,
      bubbleOpen: false,

      addMessage: (role, text) =>
        set({
          messages: [
            ...get().messages,
            { id: id(), role, text, createdAt: new Date().toISOString() },
          ].slice(-60),
        }),

      clearChat: () =>
        set({
          messages: [
            {
              id: id(),
              role: 'assistant',
              text: 'Chat cleared. Ask me about weather, reminders, or packing anytime.',
              createdAt: new Date().toISOString(),
            },
          ],
        }),

      adminTeach: (fact) => {
        const text = fact.trim();
        if (!text) return;
        const entry: KnowledgeFact = {
          id: id(),
          text,
          createdAt: new Date().toISOString(),
          source: 'admin',
        };
        set({ knowledge: [entry, ...get().knowledge].slice(0, 200) });
      },

      adminRemoveFact: (factId) =>
        set({ knowledge: get().knowledge.filter((k) => k.id !== factId) }),

      remember: (text) => {
        const trimmed = text.trim();
        if (!trimmed) return;
        const now = new Date().toISOString();
        const existing = get().memories.find(
          (m) => m.text.toLowerCase() === trimmed.toLowerCase()
        );
        if (existing) {
          set({
            memories: get().memories.map((m) =>
              m.id === existing.id ? { ...m, updatedAt: now } : m
            ),
          });
          return;
        }
        set({
          memories: [
            { id: id(), text: trimmed, createdAt: now, updatedAt: now },
            ...get().memories,
          ].slice(0, 120),
        });
      },

      forgetMatching: (query) => {
        const q = query.trim().toLowerCase();
        if (!q) return 0;
        const before = get().memories.length;
        set({
          memories: get().memories.filter((m) => !m.text.toLowerCase().includes(q)),
        });
        return before - get().memories.length;
      },

      clearMemories: () => set({ memories: [] }),

      addReminder: (text, dueAt) =>
        set({
          reminders: [{ id: id(), text: text.trim(), dueAt, done: false }, ...get().reminders],
        }),

      completeReminder: (remId) =>
        set({
          reminders: get().reminders.map((r) => (r.id === remId ? { ...r, done: true } : r)),
        }),

      setVoiceReplies: (on) => set({ voiceReplies: on }),
      setBubbleOpen: (open) => set({ bubbleOpen: open }),

      upcomingReminders: () =>
        get()
          .reminders.filter((r) => !r.done)
          .sort((a, b) => a.dueAt.localeCompare(b.dueAt)),

      // Merge new seed lines without wiping admin-fed facts
      syncSeedKnowledge: () => {
        const admin = get().knowledge.filter((k) => k.source === 'admin');
        set({ knowledge: [...admin, ...seedFacts()] });
      },
    }),
    {
      name: 'leftbehind-assistant-v2',
      storage: createJSONStorage(() => createSecureStorage()),
      onRehydrateStorage: () => (_s, error) => {
        if (error) log.warn('LeftBehind: assistant store restore failed', error);
        useAssistantStore.setState({ hasHydrated: true });
        // Ensure seed knowledge stays current after code updates
        useAssistantStore.getState().syncSeedKnowledge();
      },
    }
  )
);
