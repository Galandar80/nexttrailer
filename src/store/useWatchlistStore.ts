
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { MediaItem } from '@/services/tmdbApi';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db, auth } from '@/services/firebase';
import { onAuthStateChanged } from 'firebase/auth';

interface WatchlistState {
    items: MediaItem[];
    isLoading: boolean;
    addItem: (item: MediaItem) => Promise<void>;
    removeItem: (id: number, mediaType: 'movie' | 'tv') => Promise<void>;
    isInWatchlist: (id: number, mediaType: 'movie' | 'tv') => boolean;
    clearWatchlist: () => void;
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

const getStoredItemsForUser = (uid: string) => {
    const raw = localStorage.getItem(`watchlist-storage-${uid}`);
    if (!raw) return [];
    try {
        const data = JSON.parse(raw);
        return Array.isArray(data?.state?.items) ? data.state.items : [];
    } catch {
        return [];
    }
};

export const useWatchlistStore = create<WatchlistState>()(
    persist(
        (set, get) => {
            let activeUserId: string | null = null;
            // Setup listener for auth changes to sync
            if (auth) {
                onAuthStateChanged(auth, async (user) => {
                    if (user) {
                        if (activeUserId !== user.uid) {
                            activeUserId = user.uid;
                            localStorage.setItem("watchlist-user-id", user.uid);
                            set({ items: getStoredItemsForUser(user.uid) });
                        }
                        await get().syncWithCloud();
                    } else {
                        activeUserId = null;
                        localStorage.removeItem("watchlist-user-id");
                        localStorage.removeItem("watchlist-storage-guest");
                        set({ items: [] });
                    }
                });
            }

            return {
                items: [],
                isLoading: false,

                addItem: async (item: MediaItem) => {
                    if (!auth?.currentUser) return;
                    const { items } = get();
                    const exists = items.some(
                        (i) => i.id === item.id && i.media_type === item.media_type
                    );

                    if (!exists) {
                        const newItems = [...items, item];
                        set({ items: newItems });

                        // Sync to Firestore if logged in
                        if (auth && db && auth.currentUser) {
                            try {
                                const userRef = doc(db, 'users', auth.currentUser.uid);
                                const sanitizedItems = newItems.map((entry) => sanitizeItem(entry));
                                // Using arrayUnion to avoid duplicates in DB
                                await setDoc(userRef, { watchlist: sanitizedItems }, { merge: true });
                            } catch (e) {
                                console.error("Error adding to Firestore", e);
                            }
                        }
                    }
                },

                removeItem: async (id: number, mediaType: 'movie' | 'tv') => {
                    if (!auth?.currentUser) return;
                    const { items } = get();
                    const newItems = items.filter(
                        (item) => !(item.id === id && item.media_type === mediaType)
                    );
                    set({ items: newItems });

                    // Sync to Firestore if logged in
                    if (auth && db && auth.currentUser) {
                        try {
                            const userRef = doc(db, 'users', auth.currentUser.uid);
                            const sanitizedItems = newItems.map((entry) => sanitizeItem(entry));
                            await updateDoc(userRef, { watchlist: sanitizedItems });
                        } catch (e) {
                            console.error("Error removing from Firestore", e);
                        }
                    }
                },

                isInWatchlist: (id: number, mediaType: 'movie' | 'tv') => {
                    const { items } = get();
                    return items.some(
                        (item) => item.id === id && item.media_type === mediaType
                    );
                },

                clearWatchlist: () => {
                    set({ items: [] });
                },

                syncWithCloud: async () => {
                    if (!auth || !db || !auth.currentUser) return;
                    set({ isLoading: true });
                    try {
                        const userRef = doc(db, 'users', auth.currentUser.uid);
                        const docSnap = await getDoc(userRef);

                        if (docSnap.exists()) {
                            const cloudItems = docSnap.data().watchlist as MediaItem[];
                            const localItems = get().items;

                            // Merge strategy: Cloud wins, or Union? 
                            // Let's do Union for now to not lose valid local data
                            // Actually, simpler is: if cloud has data, take cloud. 
                            // But if user added items as guest, we want to keep them.

                            // Simple merge: Combine IDs, prefer remote if detailed data differs?
                            // Just simple de-duplication
                            const mergedMap = new Map();
                            [...localItems, ...cloudItems].forEach(item => {
                                const key = `${item.media_type}-${item.id}`;
                                mergedMap.set(key, item);
                            });

                            const mergedItems = Array.from(mergedMap.values());

                            set({ items: mergedItems });

                            // Update cloud with merged result
                            if (mergedItems.length > cloudItems.length) {
                                const sanitizedItems = mergedItems.map((entry) => sanitizeItem(entry));
                                await setDoc(userRef, { watchlist: sanitizedItems }, { merge: true });
                            }
                        } else if (get().items.length > 0) {
                            // First time sync, push local to cloud
                            const sanitizedItems = get().items.map((entry) => sanitizeItem(entry));
                            await setDoc(userRef, { watchlist: sanitizedItems }, { merge: true });
                        }
                    } catch (e) {
                        console.error("Sync watchlist failed", e);
                    } finally {
                        set({ isLoading: false });
                    }
                }
            };
        },
        {
            name: 'watchlist-storage',
            storage: createJSONStorage(() => ({
                getItem: (_name: string) => {
                    const uid = auth?.currentUser?.uid || localStorage.getItem("watchlist-user-id");
                    const key = uid ? `watchlist-storage-${uid}` : "watchlist-storage-guest";
                    return localStorage.getItem(key);
                },
                setItem: (_name: string, value: string) => {
                    const uid = auth?.currentUser?.uid || localStorage.getItem("watchlist-user-id");
                    const key = uid ? `watchlist-storage-${uid}` : "watchlist-storage-guest";
                    localStorage.setItem(key, value);
                },
                removeItem: (_name: string) => {
                    const uid = auth?.currentUser?.uid || localStorage.getItem("watchlist-user-id");
                    const key = uid ? `watchlist-storage-${uid}` : "watchlist-storage-guest";
                    localStorage.removeItem(key);
                }
            }))
        }
    )
);
