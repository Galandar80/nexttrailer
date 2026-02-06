
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { MediaItem } from '@/services/tmdbApi';
import { doc, getDoc, setDoc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
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

export const useWatchlistStore = create<WatchlistState>()(
    persist(
        (set, get) => {
            // Setup listener for auth changes to sync
            if (auth) {
                onAuthStateChanged(auth, async (user) => {
                    if (user) {
                        await get().syncWithCloud();
                    }
                });
            }

            return {
                items: [],
                isLoading: false,

                addItem: async (item: MediaItem) => {
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
                                // Using arrayUnion to avoid duplicates in DB
                                await setDoc(userRef, { watchlist: newItems }, { merge: true });
                            } catch (e) {
                                console.error("Error adding to Firestore", e);
                            }
                        }
                    }
                },

                removeItem: async (id: number, mediaType: 'movie' | 'tv') => {
                    const { items } = get();
                    const newItems = items.filter(
                        (item) => !(item.id === id && item.media_type === mediaType)
                    );
                    set({ items: newItems });

                    // Sync to Firestore if logged in
                    if (auth && db && auth.currentUser) {
                        try {
                            const userRef = doc(db, 'users', auth.currentUser.uid);
                            await updateDoc(userRef, { watchlist: newItems });
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
                                await setDoc(userRef, { watchlist: mergedItems }, { merge: true });
                            }
                        } else if (get().items.length > 0) {
                            // First time sync, push local to cloud
                            await setDoc(userRef, { watchlist: get().items }, { merge: true });
                        }
                    } catch (e) {
                        console.error("Sync failed", e);
                    } finally {
                        set({ isLoading: false });
                    }
                }
            };
        },
        {
            name: 'watchlist-storage',
        }
    )
);
