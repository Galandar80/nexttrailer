import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { HelmetProvider } from "react-helmet-async";

vi.mock("@/store/useWatchlistStore", () => ({
    useWatchlistStore: () => ({ items: [] })
}));

vi.mock("@/store/useLibraryStore", () => ({
    useLibraryStore: () => ({ items: [] })
}));

vi.mock("@/context/auth-core", () => ({
    useAuth: () => ({
        user: {
            uid: "test-user",
            displayName: "Test User",
            email: "test@example.com",
            photoURL: ""
        },
        loading: false,
        canAccess: true,
        signInWithGoogle: vi.fn(),
        signInWithEmail: vi.fn(),
        signUpWithEmail: vi.fn(),
        sendVerificationEmail: vi.fn(),
        resendVerificationWithEmail: vi.fn(),
        resetPassword: vi.fn(),
        logout: vi.fn()
    })
}));

describe('Navbar', () => {
    const queryClient = new QueryClient();
    const wrapper = ({ children }: { children: React.ReactNode }) => (
        <HelmetProvider>
            <QueryClientProvider client={queryClient}>
                <TooltipProvider>
                    <MemoryRouter>{children}</MemoryRouter>
                </TooltipProvider>
            </QueryClientProvider>
        </HelmetProvider>
    );

    it('renders NextTrailer logo', () => {
        render(
            <Navbar />,
            { wrapper }
        );

        expect(screen.getByText('Next')).toBeInTheDocument();
        expect(screen.getByText('Trailer')).toBeInTheDocument();
    });

    it('renders navigation links', () => {
        render(
            <Navbar />,
            { wrapper }
        );

        expect(screen.getByText('Home')).toBeInTheDocument();
        expect(screen.getByText('News')).toBeInTheDocument();
        expect(screen.getByText('Catalogo')).toBeInTheDocument();
        expect(screen.getByText('Community')).toBeInTheDocument();
    });

    it('renders watchlist button', () => {
        render(
            <Navbar />,
            { wrapper }
        );

        const libraryLink = screen.getByRole('link', { name: 'Storico' });
        fireEvent.mouseEnter(libraryLink);

        expect(screen.getByText('Watchlist')).toBeInTheDocument();
    });
});
