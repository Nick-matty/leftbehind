import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import * as Crypto from 'expo-crypto';
import { createSecureStorage } from '../utils/secureStore';
import { log } from '../utils/secureLog';

function id() {
  try {
    return Crypto.randomUUID();
  } catch {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }
}

export type DocType =
  | 'passport'
  | 'visa'
  | 'flight'
  | 'hotel'
  | 'vaccination'
  | 'insurance'
  | 'other';

export interface TravelDocument {
  id: string;
  type: DocType;
  title: string;
  notes?: string;
  /** Local image URI from camera/gallery — stored on-device only. */
  imageUri?: string;
  createdAt: string;
}

export interface JournalEntry {
  id: string;
  tripId?: string;
  title: string;
  body: string;
  place?: string;
  mediaUri?: string;
  createdAt: string;
}

export interface WishlistItem {
  id: string;
  destination: string;
  country: string;
  note?: string;
  createdAt: string;
}

export interface TimelineStop {
  id: string;
  tripId: string;
  day: number;
  title: string;
  done: boolean;
}

export interface FamilyMember {
  id: string;
  name: string;
  role: 'parent' | 'child' | 'partner' | 'friend';
  packedCount: number;
  totalCount: number;
}

export interface SosContact {
  id: string;
  name: string;
  phone: string;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlockedAt?: string;
}

export interface LoyaltyCard {
  id: string;
  brand: string;
  memberId: string;
  notes?: string;
}

export interface VisitedPlace {
  id: string;
  name: string;
  country: string;
  lat?: number;
  lng?: number;
  visitedAt: string;
}

interface TravelState {
  hasHydrated: boolean;
  documents: TravelDocument[];
  journal: JournalEntry[];
  wishlist: WishlistItem[];
  timeline: TimelineStop[];
  family: FamilyMember[];
  sosContacts: SosContact[];
  loyalty: LoyaltyCard[];
  visited: VisitedPlace[];
  achievements: Achievement[];
  preferredAirlineId: string;
  estimatedBagKg: number;

  addDocument: (doc: Omit<TravelDocument, 'id' | 'createdAt'>) => string;
  removeDocument: (id: string) => void;
  addJournal: (entry: Omit<JournalEntry, 'id' | 'createdAt'>) => void;
  removeJournal: (id: string) => void;
  addWishlist: (item: Omit<WishlistItem, 'id' | 'createdAt'>) => void;
  removeWishlist: (id: string) => void;
  addTimelineStop: (stop: Omit<TimelineStop, 'id'>) => void;
  toggleTimeline: (id: string) => void;
  setFamily: (members: FamilyMember[]) => void;
  updateFamilyProgress: (id: string, packed: number, total: number) => void;
  addSosContact: (c: Omit<SosContact, 'id'>) => void;
  removeSosContact: (id: string) => void;
  addLoyalty: (c: Omit<LoyaltyCard, 'id'>) => void;
  addVisited: (p: Omit<VisitedPlace, 'id'>) => void;
  setPreferredAirline: (airlineId: string) => void;
  setEstimatedBagKg: (kg: number) => void;
  unlockAchievement: (id: string) => void;
  evaluateAchievements: (stats: { tripsCompleted: number; countries: number }) => void;
}

const DEFAULT_ACHIEVEMENTS: Achievement[] = [
  { id: 'first-trip', title: 'First Trip', description: 'Complete your first trip', icon: 'flight-takeoff' },
  { id: 'frequent', title: 'Frequent Flyer', description: 'Complete 5 trips', icon: 'airplane-ticket' },
  { id: 'island', title: 'Island Hopper', description: 'Visit an island destination', icon: 'beach-access' },
  { id: 'mountain', title: 'Mountain Explorer', description: 'Log a hiking adventure', icon: 'terrain' },
  { id: 'camper', title: 'Camper', description: 'Complete a camping checklist', icon: 'cabin' },
  { id: 'world', title: 'World Traveler', description: 'Visit 3+ countries', icon: 'public' },
];

export const useTravelStore = create<TravelState>()(
  persist(
    (set, get) => ({
      hasHydrated: false,
      documents: [],
      journal: [],
      wishlist: [],
      timeline: [],
      family: [
        { id: 'self', name: 'You', role: 'parent', packedCount: 0, totalCount: 0 },
      ],
      sosContacts: [],
      loyalty: [],
      visited: [],
      achievements: DEFAULT_ACHIEVEMENTS,
      preferredAirlineId: 'emirates',
      estimatedBagKg: 0,

      addDocument: (doc) => {
        const newId = id();
        set({ documents: [{ ...doc, id: newId, createdAt: new Date().toISOString() }, ...get().documents] });
        return newId;
      },
      removeDocument: (docId) => set({ documents: get().documents.filter((d) => d.id !== docId) }),

      addJournal: (entry) =>
        set({ journal: [{ ...entry, id: id(), createdAt: new Date().toISOString() }, ...get().journal] }),
      removeJournal: (entryId) => set({ journal: get().journal.filter((j) => j.id !== entryId) }),

      addWishlist: (item) =>
        set({ wishlist: [{ ...item, id: id(), createdAt: new Date().toISOString() }, ...get().wishlist] }),
      removeWishlist: (itemId) => set({ wishlist: get().wishlist.filter((w) => w.id !== itemId) }),

      addTimelineStop: (stop) =>
        set({ timeline: [...get().timeline, { ...stop, id: id() }] }),
      toggleTimeline: (stopId) =>
        set({
          timeline: get().timeline.map((t) => (t.id === stopId ? { ...t, done: !t.done } : t)),
        }),

      setFamily: (members) => set({ family: members }),
      updateFamilyProgress: (memberId, packed, total) =>
        set({
          family: get().family.map((m) =>
            m.id === memberId ? { ...m, packedCount: packed, totalCount: total } : m
          ),
        }),

      addSosContact: (c) => set({ sosContacts: [...get().sosContacts, { ...c, id: id() }] }),
      removeSosContact: (contactId) =>
        set({ sosContacts: get().sosContacts.filter((c) => c.id !== contactId) }),

      addLoyalty: (c) => set({ loyalty: [...get().loyalty, { ...c, id: id() }] }),

      addVisited: (p) =>
        set({ visited: [{ ...p, id: id() }, ...get().visited] }),

      setPreferredAirline: (airlineId) => set({ preferredAirlineId: airlineId }),
      setEstimatedBagKg: (kg) => set({ estimatedBagKg: kg }),

      unlockAchievement: (achId) =>
        set({
          achievements: get().achievements.map((a) =>
            a.id === achId && !a.unlockedAt ? { ...a, unlockedAt: new Date().toISOString() } : a
          ),
        }),

      evaluateAchievements: ({ tripsCompleted, countries }) => {
        const unlock = get().unlockAchievement;
        if (tripsCompleted >= 1) unlock('first-trip');
        if (tripsCompleted >= 5) unlock('frequent');
        if (countries >= 3) unlock('world');
      },
    }),
    {
      name: 'leftbehind-travel-v1',
      storage: createJSONStorage(() => createSecureStorage()),
      onRehydrateStorage: () => (_s, error) => {
        if (error) log.warn('LeftBehind: travel store restore failed', error);
        useTravelStore.setState({ hasHydrated: true });
      },
    }
  )
);
