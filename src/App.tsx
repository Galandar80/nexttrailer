
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { useEffect, useState, lazy, Suspense } from "react";
import ErrorBoundary from "./components/ErrorBoundary";
import { useApiKeyStore } from "./store/useApiKeyStore";
import { AuthProvider } from "./context/AuthContext";

// Lazy loading per le pagine
const Home = lazy(() => import("./pages/Home"));
const Catalogo = lazy(() => import("./pages/Catalogo"));
const MediaDetails = lazy(() => import("./pages/MediaDetails"));
const Search = lazy(() => import("./pages/Search"));
const GenreBrowse = lazy(() => import("./pages/GenreBrowse"));
const Genres = lazy(() => import("./pages/Genres"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Movies = lazy(() => import("./pages/Movies"));
const TvSeries = lazy(() => import("./pages/TvSeries"));
const Watchlist = lazy(() => import("./pages/Watchlist"));
const Library = lazy(() => import("./pages/Library"));
const PersonDetails = lazy(() => import("./pages/PersonDetails"));
const Oscar = lazy(() => import("./pages/Oscar"));
const Preferences = lazy(() => import("./pages/Preferences"));
const NewsArticle = lazy(() => import("./pages/NewsArticle"));
const NewsAdmin = lazy(() => import("./pages/NewsAdmin"));
const NewsArchive = lazy(() => import("./pages/NewsArchive"));
const Community = lazy(() => import("./pages/Community"));
const Profile = lazy(() => import("./pages/Profile"));
const Followers = lazy(() => import("./pages/Followers"));
const Following = lazy(() => import("./pages/Following"));
const Notifications = lazy(() => import("./pages/Notifications"));

// Configurazione di React Query per gestire meglio le richieste API
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 5, // 5 minuti
    },
  },
});

const App = () => {
  const { apiKey, accessToken } = useApiKeyStore();
  const [isReady, setIsReady] = useState(false);

  // Assicura che l'app abbia caricato le configurazioni prima di renderizzare il contenuto
  useEffect(() => {
    if (apiKey || accessToken) {
      queryClient.invalidateQueries();
    }
    setIsReady(true);
  }, [apiKey, accessToken]);

  if (!isReady) {
    return <div className="flex items-center justify-center h-screen">Caricamento configurazioni...</div>;
  }

  return (
    <ErrorBoundary>
      <HelmetProvider>
        <AuthProvider>
          <QueryClientProvider client={queryClient}>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <BrowserRouter>
                <Suspense fallback={
                  <div className="flex items-center justify-center h-screen">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent mx-auto mb-4"></div>
                      <p className="text-muted-foreground">Caricamento...</p>
                    </div>
                  </div>
                }>
                  <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/catalogo" element={<Catalogo />} />
                    <Route path="/search" element={<Search />} />
                    <Route path="/genres" element={<Genres />} />
                    <Route path="/:mediaType/:id" element={<MediaDetails />} />
                    <Route path="/:mediaType/genre/:genreId" element={<GenreBrowse />} />
                    <Route path="/person/:id" element={<PersonDetails />} />
                    <Route path="/movies" element={<Movies />} />
                    <Route path="/tv" element={<TvSeries />} />
                    <Route path="/oscar" element={<Oscar />} />
                    <Route path="/news/admin" element={<NewsAdmin />} />
                    <Route path="/news/archivio" element={<NewsArchive />} />
                    <Route path="/news/article" element={<NewsArticle />} />
                    <Route path="/news/:id" element={<NewsArticle />} />
                    <Route path="/news" element={<NewsArchive />} />
                    <Route path="/community" element={<Community />} />
                    <Route path="/notifiche" element={<Notifications />} />
                    <Route path="/profilo" element={<Profile />} />
                    <Route path="/profilo/:id" element={<Profile />} />
                    <Route path="/profilo/:id/follower" element={<Followers />} />
                    <Route path="/profilo/:id/seguiti" element={<Following />} />
                    <Route path="/profilo/follower" element={<Followers />} />
                    <Route path="/profilo/seguiti" element={<Following />} />
                    <Route path="/watchlist" element={<Watchlist />} />
                    <Route path="/storico" element={<Library />} />
                    <Route path="/preferenze" element={<Preferences />} />
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </Suspense>
              </BrowserRouter>
            </TooltipProvider>
          </QueryClientProvider>
        </AuthProvider>
      </HelmetProvider>
    </ErrorBoundary>
  );
};

export default App;
