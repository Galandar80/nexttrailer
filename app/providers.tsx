"use client";

import { useEffect, useMemo } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import ErrorBoundary from "@/components/ErrorBoundary";
import { useApiKeyStore } from "@/store/useApiKeyStore";
import { AuthProvider } from "@/context/AuthContext";
import { HelmetProvider } from "react-helmet-async";

export default function Providers({ children }: { children: React.ReactNode }) {
  const { apiKey, accessToken } = useApiKeyStore();
  const queryClient = useMemo(() => new QueryClient({
    defaultOptions: {
      queries: {
        retry: 2,
        refetchOnWindowFocus: false,
        staleTime: 1000 * 60 * 5
      }
    }
  }), []);

  useEffect(() => {
    if (apiKey || accessToken) {
      queryClient.invalidateQueries();
    }
  }, [apiKey, accessToken, queryClient]);

  return (
    <ErrorBoundary>
      <HelmetProvider>
        <AuthProvider>
          <QueryClientProvider client={queryClient}>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              {children}
            </TooltipProvider>
          </QueryClientProvider>
        </AuthProvider>
      </HelmetProvider>
    </ErrorBoundary>
  );
}
