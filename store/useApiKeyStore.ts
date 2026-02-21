
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ApiKeyState {
  apiKey: string;
  setApiKey: (apiKey: string) => void;
  accessToken: string;
  setAccessToken: (token: string) => void;
}

// API key e access token da variabili d'ambiente
const DEFAULT_API_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY || '';
const DEFAULT_ACCESS_TOKEN = process.env.NEXT_PUBLIC_TMDB_ACCESS_TOKEN || '';

export const useApiKeyStore = create<ApiKeyState>()(
  persist(
    (set) => ({
      apiKey: DEFAULT_API_KEY,
      setApiKey: (apiKey: string) => set({ apiKey }),
      accessToken: DEFAULT_ACCESS_TOKEN,
      setAccessToken: (accessToken: string) => set({ accessToken }),
    }),
    {
      name: 'api-key-storage-v2',
    }
  )
);
