import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useWatchlistStore } from '../store/useWatchlistStore';

vi.mock("@/services/firebase", () => ({
    isFirebaseEnabled: true,
    getAuth: () => Promise.resolve({ currentUser: { uid: "test-user" } }),
    getDb: () => Promise.resolve({}),
    getAuthModule: () => Promise.resolve({
        onAuthStateChanged: (_auth: unknown, callback: (user: { uid: string } | null) => void) => {
            callback({ uid: "test-user" });
            return () => {};
        }
    }),
    getFirestoreModule: () => Promise.resolve({
        doc: vi.fn(),
        setDoc: vi.fn(),
        updateDoc: vi.fn(),
        getDoc: vi.fn().mockResolvedValue({ exists: () => false })
    })
}));

describe('useWatchlistStore', () => {
    beforeEach(() => {
        localStorage.clear();
        useWatchlistStore.setState({ items: [], isLoading: false });
    });

    it('should add item to watchlist', async () => {
        const { result } = renderHook(() => useWatchlistStore());

        const testItem = {
            id: 1,
            title: 'Test Movie',
            media_type: 'movie' as const,
            poster_path: '/test.jpg',
            vote_average: 8.5,
            release_date: '2024-01-01'
        };

        await act(async () => {
            await result.current.addItem(testItem);
        });

        expect(result.current.items).toHaveLength(1);
        expect(result.current.items[0].title).toBe('Test Movie');
    });

    it('should remove item from watchlist', async () => {
        const { result } = renderHook(() => useWatchlistStore());

        const testItem = {
            id: 1,
            title: 'Test Movie',
            media_type: 'movie' as const,
            poster_path: '/test.jpg',
            vote_average: 8.5,
            release_date: '2024-01-01'
        };

        await act(async () => {
            await result.current.addItem(testItem);
            await result.current.removeItem(1, 'movie');
        });

        expect(result.current.items).toHaveLength(0);
    });

    it('should check if item is in watchlist', async () => {
        const { result } = renderHook(() => useWatchlistStore());

        const testItem = {
            id: 1,
            title: 'Test Movie',
            media_type: 'movie' as const,
            poster_path: '/test.jpg',
            vote_average: 8.5,
            release_date: '2024-01-01'
        };

        await act(async () => {
            await result.current.addItem(testItem);
        });

        expect(result.current.isInWatchlist(1, 'movie')).toBe(true);
        expect(result.current.isInWatchlist(2, 'movie')).toBe(false);
    });
});
