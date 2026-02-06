
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Flame, CalendarDays, Sparkles, Plus, Projector } from "lucide-react";
import { SEO } from "@/components/SEO";
import { tmdbApi, MediaItem, Genre } from "@/services/tmdbApi";
import Navbar from "@/components/Navbar";
import TrailerCarousel from "@/components/TrailerCarousel";
import ContentRow from "@/components/ContentRow";
import Footer from "@/components/Footer";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

const shuffleArray = <T,>(array: T[]): T[] => {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
};

const shouldRefreshContent = (): boolean => {
  const lastRefresh = localStorage.getItem('lastContentRefresh');
  if (!lastRefresh) return true;

  const lastRefreshDate = new Date(parseInt(lastRefresh));
  const now = new Date();

  const diffHours = (now.getTime() - lastRefreshDate.getTime()) / (1000 * 60 * 60);

  return diffHours >= 12;
};

const Home = () => {
  const [trendingContent, setTrendingContent] = useState<MediaItem[]>([]);
  const [latestReleases, setLatestReleases] = useState<MediaItem[]>([]);
  const [popularMovies, setPopularMovies] = useState<MediaItem[]>([]);
  const [popularTvShows, setPopularTvShows] = useState<MediaItem[]>([]);
  const [upcomingReleases, setUpcomingReleases] = useState<MediaItem[]>([]);
  const [futureReleases, setFutureReleases] = useState<MediaItem[]>([]);

  // Platform content state
  const [netflixContent, setNetflixContent] = useState<MediaItem[]>([]);
  const [hboContent, setHboContent] = useState<MediaItem[]>([]);
  const [primeContent, setPrimeContent] = useState<MediaItem[]>([]);
  const [disneyContent, setDisneyContent] = useState<MediaItem[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [loadingError, setLoadingError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const loadContent = async () => {
      setIsLoading(true);
      setLoadingError(null);

      try {
        // Fetch standard content + platforms
        const [trending, latest, popMovies, popTV, upcoming] = await Promise.all([
          tmdbApi.getTrending("all", "day"),
          tmdbApi.getLatestReleases(),
          tmdbApi.getPopular("movie"),
          tmdbApi.getPopular("tv"),
          tmdbApi.getUpcoming()
        ]);

        // Helper fetcher for platforms (mix movies and tv)
        const fetchPlatformContent = async (providerId?: string, networkId?: number) => {
          try {
            const filters = {
              sortBy: 'popularity.desc',
              year: new Date().getFullYear(),
              with_watch_providers: providerId,
              with_networks: networkId
            };

            const [movies, tv] = await Promise.all([
              tmdbApi.discoverMedia({ ...filters, mediaType: 'movie' }),
              tmdbApi.discoverMedia({ ...filters, mediaType: 'tv' })
            ]);
            return shuffleArray([...movies, ...tv]).slice(0, 15);
          } catch (e) {
            console.error("Error fetching platform content", e);
            return [];
          }
        };

        const [netflix, hbo, prime, disney] = await Promise.all([
          fetchPlatformContent("8", undefined),       // Netflix
          fetchPlatformContent(undefined, 49),        // HBO (Network)
          fetchPlatformContent("119", undefined),     // Prime Video
          fetchPlatformContent("337", undefined)      // Disney+
        ]);

        if (!trending.length && !latest.length) {
          throw new Error("Nessun dato ricevuto dall'API");
        }

        const filteredTrending = trending.filter((item) => item.media_type !== "person");
        const topTrending = filteredTrending
          .sort((a, b) => b.popularity - a.popularity)
          .slice(0, 8);

        setTrendingContent(topTrending);
        setLatestReleases(latest);
        setPopularMovies(popMovies);
        setPopularTvShows(popTV);
        setUpcomingReleases(upcoming);

        // Platform state
        setNetflixContent(netflix);
        setHboContent(hbo);
        setPrimeContent(prime);
        setDisneyContent(disney);

        // Crea una selezione mista di film e serie TV future
        const mixedFutureReleases = shuffleArray([...upcoming.slice(0, 10), ...popTV.slice(0, 5)]);
        setFutureReleases(mixedFutureReleases);

        localStorage.setItem('lastContentRefresh', Date.now().toString());

        // Cache data (simplified for brevity, ideally would cache platforms too)

      } catch (error) {
        console.error("Errore nel caricamento dei contenuti della homepage:", error);
        setLoadingError("Si è verificato un errore nel caricamento dei contenuti.");
        toast({
          title: "Errore nel caricamento dei contenuti",
          description: "Utilizzando contenuti di esempio. Per utilizzare dati reali, è necessaria una API key valida.",
          variant: "destructive"
        });

      } finally {
        setIsLoading(false);
      }
    };

    // Simplification: Always load content to ensure fresh platform data for now
    console.log("HOMEPAGE MOUNTED - TOAST SHOULD BE GONE");
    loadContent();
  }, [toast]);

  const handleGenreSelect = (genre: Genre, mediaType: "movie" | "tv") => {
    navigate(`/${mediaType}/genre/${genre.id}?name=${genre.name}`);
  };

  const handleRetry = () => {
    localStorage.removeItem('lastContentRefresh');
    window.location.reload();
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!searchQuery.trim()) {
      toast({
        title: "Ricerca vuota",
        description: "Inserisci un termine di ricerca",
        variant: "default"
      });
      return;
    }

    navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
  };

  const recommendedContent = shuffleArray([...popularMovies, ...popularTvShows]).slice(0, 15);

  const renderSkeletonLoader = () => (
    <div className="space-y-8">
      <div className="h-[60vh] bg-secondary/20 animate-pulse flex items-center justify-center">
        <p className="text-muted-foreground">Caricamento contenuti in evidenza...</p>
      </div>

      {[1, 2, 3].map((i) => (
        <div key={i} className="space-y-3">
          <div className="flex items-center gap-2">
            <Skeleton className="h-6 w-6" />
            <Skeleton className="h-6 w-40" />
          </div>
          <div className="flex gap-4 overflow-hidden">
            {[1, 2, 3, 4, 5].map((j) => (
              <Skeleton key={j} className="w-[180px] h-[270px] rounded-md" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SEO />
      <Navbar />

      {isLoading ? (
        renderSkeletonLoader()
      ) : loadingError && trendingContent.length === 0 ? (
        <div className="h-[60vh] flex flex-col items-center justify-center gap-4">
          <p className="text-lg text-muted-foreground">{loadingError}</p>
          <p className="text-sm text-muted-foreground mb-2">
            L'API key di TMDB non è valida. Controlla il file src/services/tmdbApi.ts per aggiornare con un API key valida.
          </p>
          <Button
            onClick={handleRetry}
            variant="default"
            className="bg-accent hover:bg-accent/90 text-white"
          >
            Riprova
          </Button>
        </div>
      ) : (
        <>
          {trendingContent.length > 0 && (
            <TrailerCarousel featuredContent={trendingContent.slice(0, 6)} />
          )}

          <main className="max-w-screen-2xl mx-auto px-4 md:px-8 -mt-8 relative z-10">
            {trendingContent.length > 0 && (
              <ContentRow
                title="In Tendenza Ora"
                icon={<Flame className="text-accent" />}
                items={trendingContent}
                showBadges={true}
              />
            )}

            {latestReleases.length > 0 && (
              <ContentRow
                title="Ultime Uscite"
                icon={<CalendarDays />}
                items={latestReleases}
                showBadges={true}
              />
            )}

            {/* Platform Sections */}
            {hboContent.length > 0 && (
              <ContentRow
                title="In Tendenza su HBO"
                icon={<img src="https://upload.wikimedia.org/wikipedia/commons/d/de/HBO_logo.svg" alt="HBO" className="h-6 w-auto object-contain" />}
                items={hboContent}
              />
            )}

            {netflixContent.length > 0 && (
              <ContentRow
                title="In Tendenza su Netflix"
                icon={<img src="https://upload.wikimedia.org/wikipedia/commons/0/08/Netflix_2015_logo.svg" alt="Netflix" className="h-6 w-auto object-contain" />}
                items={netflixContent}
              />
            )}

            {primeContent.length > 0 && (
              <ContentRow
                title="In Tendenza su Prime Video"
                icon={<img src="https://upload.wikimedia.org/wikipedia/commons/f/f1/Prime_Video.png" alt="Prime Video" className="h-6 w-auto object-contain" />}
                items={primeContent}
              />
            )}

            {disneyContent.length > 0 && (
              <ContentRow
                title="In Tendenza su Disney+"
                icon={<img src="https://upload.wikimedia.org/wikipedia/commons/3/3e/Disney%2B_logo.svg" alt="Disney+" className="h-6 w-auto object-contain" />}
                items={disneyContent}
              />
            )}

            {popularMovies.length > 0 && (
              <ContentRow
                title="Film Popolari"
                items={popularMovies}
              />
            )}

            {popularTvShows.length > 0 && (
              <ContentRow
                title="Serie TV Popolari"
                items={popularTvShows}
              />
            )}

            {/* Nuova sezione Prossime Uscite */}
            {futureReleases.length > 0 && (
              <ContentRow
                title="Prossime Uscite"
                icon={<Projector className="text-purple-500" />}
                items={futureReleases}
                showBadges={true}
              />
            )}

            {upcomingReleases.length > 0 && (
              <ContentRow
                title="Coming Soon"
                icon={<Plus className="text-green-500" />}
                items={upcomingReleases}
                showBadges={true}
              />
            )}

            {recommendedContent.length > 0 && (
              <ContentRow
                title="Consigliati Per Te"
                icon={<Sparkles className="text-amber-400" />}
                items={recommendedContent}
              />
            )}

          </main>
        </>
      )}

      <Footer />
    </div>
  );
};

export default Home;
