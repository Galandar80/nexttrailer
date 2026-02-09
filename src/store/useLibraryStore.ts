import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { db, auth } from "@/services/firebase";

export type LibraryStatus = "planned" | "watching" | "completed" | "dropped";

export interface LibraryItem {
  id: number;
  media_type: "movie" | "tv";
  title?: string;
  name?: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  release_date?: string;
  first_air_date?: string;
  status: LibraryStatus;
  addedAt: string;
  updatedAt: string;
  watchedAt?: string | null;
  episodeProgress?: Record<string, number[]>;
}

interface LibraryState {
  items: LibraryItem[];
  isLoading: boolean;
  addItem: (item: LibraryItem) => Promise<void>;
  removeItem: (id: number, mediaType: "movie" | "tv") => Promise<void>;
  updateStatus: (id: number, mediaType: "movie" | "tv", status: LibraryStatus) => Promise<void>;
  markMovieWatched: (id: number) => Promise<void>;
  toggleEpisodeWatched: (tvId: number, seasonNumber: number, episodeNumber: number) => Promise<void>;
  setSeasonWatched: (tvId: number, seasonNumber: number, episodeNumbers: number[]) => Promise<void>;
  isEpisodeWatched: (tvId: number, seasonNumber: number, episodeNumber: number) => boolean;
  getItem: (id: number, mediaType: "movie" | "tv") => LibraryItem | undefined;
  syncWithCloud: () => Promise<void>;
}

const sanitizeValue = (value: unknown): unknown => {
  if (value === undefined) return undefined;
  if (Array.isArray(value)) {
    return value.map(sanitizeValue).filter((item) => item !== undefined);
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .map(([key, val]) => [key, sanitizeValue(val)] as const)
        .filter(([, val]) => val !== undefined)
    );
  }
  return value;
};

const sanitizeItem = <T extends Record<string, unknown>>(item: T): T => {
  return sanitizeValue(item) as T;
};

const nowIso = () => new Date().toISOString();

const getUserStorageKey = () => {
  const uid = auth?.currentUser?.uid || localStorage.getItem("library-user-id");
  return uid ? `library-storage-${uid}` : "library-storage-guest";
};

const getStoredItemsForUser = (uid: string) => {
  const raw = localStorage.getItem(`library-storage-${uid}`);
  if (!raw) return [];
  try {
    const data = JSON.parse(raw);
    return Array.isArray(data?.state?.items) ? data.state.items : [];
  } catch {
    return [];
  }
};

const userStorage = createJSONStorage(() => ({
  getItem: (_name: string) => localStorage.getItem(getUserStorageKey()),
  setItem: (_name: string, value: string) => localStorage.setItem(getUserStorageKey(), value),
  removeItem: (_name: string) => localStorage.removeItem(getUserStorageKey())
}));

const updateCloud = async (items: LibraryItem[]) => {
  if (!auth || !db || !auth.currentUser) return;
  const userRef = doc(db, "users", auth.currentUser.uid);
  const sanitizedItems = items.map((entry) => sanitizeItem(entry));
  await setDoc(userRef, { library: sanitizedItems }, { merge: true });
};

export const useLibraryStore = create<LibraryState>()(
  persist(
    (set, get) => {
      let activeUserId: string | null = null;
      if (auth) {
        onAuthStateChanged(auth, async (user) => {
          if (user) {
            if (activeUserId !== user.uid) {
              activeUserId = user.uid;
              localStorage.setItem("library-user-id", user.uid);
              set({ items: getStoredItemsForUser(user.uid) });
            }
            await get().syncWithCloud();
          } else {
            activeUserId = null;
            localStorage.removeItem("library-user-id");
            localStorage.removeItem("library-storage-guest");
            set({ items: [] });
          }
        });
      }

      return {
        items: [],
        isLoading: false,

        addItem: async (item: LibraryItem) => {
          if (!auth?.currentUser) return;
          const { items } = get();
          const existsIndex = items.findIndex(
            (i) => i.id === item.id && i.media_type === item.media_type
          );
          const updatedAt = nowIso();
          let newItems = items;
          if (existsIndex > -1) {
            newItems = items.map((i, idx) =>
              idx === existsIndex ? { ...i, ...item, updatedAt } : i
            );
          } else {
            newItems = [...items, { ...item, addedAt: updatedAt, updatedAt }];
          }
          set({ items: newItems });
          await updateCloud(newItems);
        },

        removeItem: async (id: number, mediaType: "movie" | "tv") => {
          if (!auth?.currentUser) return;
          const { items } = get();
          const newItems = items.filter(
            (item) => !(item.id === id && item.media_type === mediaType)
          );
          set({ items: newItems });
          if (auth && db && auth.currentUser) {
            const userRef = doc(db, "users", auth.currentUser.uid);
            const sanitizedItems = newItems.map((entry) => sanitizeItem(entry));
            await updateDoc(userRef, { library: sanitizedItems });
          }
        },

        updateStatus: async (id: number, mediaType: "movie" | "tv", status: LibraryStatus) => {
          if (!auth?.currentUser) return;
          const updatedAt = nowIso();
          const newItems = get().items.map<LibraryItem>((item) => {
            if (item.id === id && item.media_type === mediaType) {
              return {
                ...item,
                status,
                updatedAt,
                watchedAt: status === "completed" ? updatedAt : item.watchedAt
              };
            }
            return item;
          });
          set({ items: newItems });
          await updateCloud(newItems);
        },

        markMovieWatched: async (id: number) => {
          if (!auth?.currentUser) return;
          const updatedAt = nowIso();
          const newItems = get().items.map<LibraryItem>((item) => {
            if (item.id === id && item.media_type === "movie") {
              return { ...item, status: "completed", updatedAt, watchedAt: updatedAt };
            }
            return item;
          });
          set({ items: newItems });
          await updateCloud(newItems);
        },

        toggleEpisodeWatched: async (tvId: number, seasonNumber: number, episodeNumber: number) => {
          if (!auth?.currentUser) return;
          const updatedAt = nowIso();
          const items = get().items;
          const existing = items.find((i) => i.id === tvId && i.media_type === "tv");
          const seasonKey = String(seasonNumber);
          if (!existing) return;
          const progress = existing.episodeProgress || {};
          const current = new Set(progress[seasonKey] || []);
          if (current.has(episodeNumber)) {
            current.delete(episodeNumber);
          } else {
            current.add(episodeNumber);
          }
          const newProgress = { ...progress, [seasonKey]: Array.from(current).sort((a, b) => a - b) };
          const newItems = items.map<LibraryItem>((item) =>
            item.id === tvId && item.media_type === "tv"
              ? {
                  ...item,
                  episodeProgress: newProgress,
                  status: item.status === "planned" ? "watching" : item.status,
                  updatedAt
                }
              : item
          );
          set({ items: newItems });
          await updateCloud(newItems);
        },

        setSeasonWatched: async (tvId: number, seasonNumber: number, episodeNumbers: number[]) => {
          if (!auth?.currentUser) return;
          const updatedAt = nowIso();
          const items = get().items;
          const existing = items.find((i) => i.id === tvId && i.media_type === "tv");
          if (!existing) return;
          const seasonKey = String(seasonNumber);
          const progress = existing.episodeProgress || {};
          const uniqueEpisodes = Array.from(new Set(episodeNumbers)).sort((a, b) => a - b);
          const newProgress = { ...progress, [seasonKey]: uniqueEpisodes };
          const newItems = items.map<LibraryItem>((item) =>
            item.id === tvId && item.media_type === "tv"
              ? {
                  ...item,
                  episodeProgress: newProgress,
                  status: item.status === "planned" ? "watching" : item.status,
                  updatedAt
                }
              : item
          );
          set({ items: newItems });
          await updateCloud(newItems);
        },

        isEpisodeWatched: (tvId, seasonNumber, episodeNumber) => {
          const item = get().items.find((i) => i.id === tvId && i.media_type === "tv");
          if (!item?.episodeProgress) return false;
          const list = item.episodeProgress[String(seasonNumber)] || [];
          return list.includes(episodeNumber);
        },

        getItem: (id, mediaType) => {
          return get().items.find((i) => i.id === id && i.media_type === mediaType);
        },

        syncWithCloud: async () => {
          if (!auth || !db || !auth.currentUser) return;
          set({ isLoading: true });
          try {
            const userRef = doc(db, "users", auth.currentUser.uid);
            const docSnap = await getDoc(userRef);
            if (docSnap.exists()) {
              const cloudItems = (docSnap.data().library as LibraryItem[]) || [];
              const localItems = get().items;
              const mergedMap = new Map<string, LibraryItem>();
              [...localItems, ...cloudItems].forEach((item) => {
                const key = `${item.media_type}-${item.id}`;
                mergedMap.set(key, item);
              });
              const mergedItems = Array.from(mergedMap.values());
              set({ items: mergedItems });
              if (mergedItems.length > cloudItems.length) {
                const sanitizedItems = mergedItems.map((entry) => sanitizeItem(entry));
                await setDoc(userRef, { library: sanitizedItems }, { merge: true });
              }
            } else if (get().items.length > 0) {
              const sanitizedItems = get().items.map((entry) => sanitizeItem(entry));
              await setDoc(userRef, { library: sanitizedItems }, { merge: true });
            }
          } catch (error) {
            console.error("Sync library failed", error);
          } finally {
            set({ isLoading: false });
          }
        }
      };
    },
    {
      name: "library-storage",
      storage: userStorage
    }
  )
);
