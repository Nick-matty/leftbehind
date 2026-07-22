// Core trip/packing data. Auth lives in authStore.ts; theme/language live in
// settingsStore.ts. Everything here works fully offline — it's all local
// AsyncStorage, no network calls.
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import * as Crypto from 'expo-crypto';
import { createSecureStorage } from '../utils/secureStore';
import { log } from '../utils/secureLog';
import { VenueType } from '../data/venues';

export type TripStatus = 'upcoming' | 'active' | 'completed';

export interface Trip {
  id: string;
  destination: string;
  country: string;
  venueId: VenueType;
  venueName: string;
  startDate: string; // yyyy-mm-dd
  endDate: string; // yyyy-mm-dd
  checkInTime?: string; // e.g. "10:00 AM"
  checkOutTime?: string; // e.g. "12:00 PM"
  checkedItems: string[];
  totalItems: number;
  status: TripStatus;
  budgetTotal: number;
  note?: string;
  reminderId?: string;
  createdAt: string;
  completedAt?: string;
}

export interface PersonalBlindSpot {
  // Keyed by the normalized item label so "phone charger" is tracked as ONE
  // pattern across every venue it appears in, not split per venue-item id.
  label: string;
  missCount: number;
  checkCount: number;
}

export interface BudgetEntry {
  id: string;
  tripId?: string;
  date: string; // yyyy-mm-dd
  label: string;
  amount: number;
  createdAt: string;
}

interface AppState {
  onboardingDone: boolean;
  hasHydrated: boolean;
  completeOnboarding: () => void;

  trips: Trip[];
  blindSpots: Record<string, PersonalBlindSpot>;
  budgetEntries: BudgetEntry[];

  createTrip: (input: {
    destination: string;
    country: string;
    venueId: VenueType;
    venueName: string;
    startDate: string;
    endDate: string;
    checkInTime?: string;
    checkOutTime?: string;
    totalItems: number;
    budgetTotal: number;
  }) => string;
  toggleItem: (tripId: string, itemId: string, itemLabel: string) => void;
  startTripNow: (tripId: string) => void;
  completeTrip: (tripId: string, note?: string) => void;
  deleteTrip: (tripId: string) => void;
  addBudgetEntry: (entry: Omit<BudgetEntry, 'id' | 'createdAt'>) => void;
  removeBudgetEntry: (id: string) => void;
  setTripBudget: (tripId: string, amount: number) => void;
  setReminderId: (tripId: string, reminderId: string | undefined) => void;

  upcomingTrip: () => Trip | null;
  activeTrip: () => Trip | null;
}

function normalizeLabel(label: string): string {
  return label.trim().toLowerCase();
}

function makeId(): string {
  try {
    return Crypto.randomUUID();
  } catch {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  }
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      onboardingDone: false,
      hasHydrated: false,
      completeOnboarding: () => set({ onboardingDone: true }),

      trips: [],
      blindSpots: {},
      budgetEntries: [],

      createTrip: (input) => {
        const id = makeId();
        const trip: Trip = {
          id,
          ...input,
          checkedItems: [],
          status: 'upcoming',
          createdAt: new Date().toISOString(),
        };
        set({ trips: [trip, ...get().trips] });
        return id;
      },

      startTripNow: (tripId) => {
        set({
          trips: get().trips.map((t) =>
            t.id === tripId ? { ...t, status: 'active' as TripStatus } : t
          ),
        });
      },

      toggleItem: (tripId, itemId, itemLabel) => {
        const { trips, blindSpots } = get();
        const trip = trips.find((t) => t.id === tripId);
        if (!trip) return;
        const already = trip.checkedItems.includes(itemId);
        const checkedItems = already
          ? trip.checkedItems.filter((id) => id !== itemId)
          : [...trip.checkedItems, itemId];

        const key = normalizeLabel(itemLabel);
        const existing = blindSpots[key] || { label: itemLabel, missCount: 0, checkCount: 0 };
        const nowChecked = !already;

        set({
          trips: trips.map((t) => (t.id === tripId ? { ...t, checkedItems, status: 'active' } : t)),
          blindSpots: {
            ...blindSpots,
            [key]: {
              ...existing,
              checkCount: existing.checkCount + 1,
              missCount: nowChecked ? existing.missCount : existing.missCount + 1,
            },
          },
        });
      },

      completeTrip: (tripId, note) => {
        set({
          trips: get().trips.map((t) =>
            t.id === tripId
              ? { ...t, status: 'completed' as TripStatus, completedAt: new Date().toISOString(), note }
              : t
          ),
        });
      },

      deleteTrip: (tripId) => {
        set({
          trips: get().trips.filter((t) => t.id !== tripId),
          budgetEntries: get().budgetEntries.filter((e) => e.tripId !== tripId),
        });
      },

      addBudgetEntry: (entry) => {
        const newEntry: BudgetEntry = { ...entry, id: makeId(), createdAt: new Date().toISOString() };
        set({ budgetEntries: [newEntry, ...get().budgetEntries] });
      },

      removeBudgetEntry: (id) => set({ budgetEntries: get().budgetEntries.filter((e) => e.id !== id) }),

      setTripBudget: (tripId, amount) => {
        set({ trips: get().trips.map((t) => (t.id === tripId ? { ...t, budgetTotal: amount } : t)) });
      },

      setReminderId: (tripId, reminderId) => {
        set({ trips: get().trips.map((t) => (t.id === tripId ? { ...t, reminderId } : t)) });
      },

      upcomingTrip: () => {
        const upcoming = get().trips.filter((t) => t.status !== 'completed');
        if (upcoming.length === 0) return null;
        return [...upcoming].sort((a, b) => a.startDate.localeCompare(b.startDate))[0];
      },

      activeTrip: () => get().trips.find((t) => t.status === 'active') ?? null,
    }),
    {
      name: 'leftbehind-storage-v3',
      storage: createJSONStorage(() => createSecureStorage()),
      // Guard against a corrupted persisted blob crashing the app on launch —
      // fall back to a clean slate rather than throwing during hydration.
      onRehydrateStorage: () => (state, error) => {
        if (error) {
          log.warn('LeftBehind: failed to restore saved data, starting fresh.', error);
        }
        useAppStore.setState({ hasHydrated: true });
      },
    }
  )
);
