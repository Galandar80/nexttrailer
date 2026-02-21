"use client";

import { useState, useEffect, useMemo } from "react";
import { Flame, CalendarDays, Sparkles, Plus, Projector } from "lucide-react";
import { SEO } from "@/components/SEO";
import { tmdbApi, MediaItem } from "@/services/tmdbApi";
import Navbar from "@/components/Navbar";
import TrailerCarousel from "@/components/TrailerCarousel";
import ContentRow from "@/components/ContentRow";
import Footer from "@/components/Footer";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { OptimizedImage } from "@/components/OptimizedImage";

const seededFraction = (seed: number) => {
  const value = Math.sin(seed) * 10000;
  return value - Math.floor(value);
};

const shuffleArray = <T,>(array: T[], seed: number): T[] => {
  const newArray = [...array];
  let currentSeed = seed;
  for (let i = newArray.length - 1; i > 0; i--) {
    currentSeed += 1;
    const j = Math.floor(seededFraction(currentSeed) * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
};

const Catalogo = () => {
  const [trendingContent, setTrendingContent] = useState<MediaItem[]>([]);
  const [latestReleases, setLatestReleases] = useState<MediaItem[]>([]);
  const [popularMovies, setPopularMovies] = useState<MediaItem[]>([]);
  const [popularTvShows, setPopularTvShows] = useState<MediaItem[]>([]);
  const [nowPlayingMovies, setNowPlayingMovies] = useState<MediaItem[]>([]);
  const [upcomingReleases, setUpcomingReleases] = useState<MediaItem[]>([]);

  const [netflixContent, setNetflixContent] = useState<MediaItem[]>([]);
  const [hboContent, setHboContent] = useState<MediaItem[]>([]);
  const [primeContent, setPrimeContent] = useState<MediaItem[]>([]);
  const [disneyContent, setDisneyContent] = useState<MediaItem[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [loadingError, setLoadingError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const loadContent = async () => {
      setIsLoading(true);
      setLoadingError(null);

      try {
        const [trending, latest, popMovies, popTV, nowPlaying, upcoming] = await Promise.all([
          tmdbApi.getTrending("all", "day"),
          tmdbApi.getLatestReleases(),
          tmdbApi.getPopular("movie"),
          tmdbApi.getPopular("tv"),
          tmdbApi.getNowPlaying(),
          tmdbApi.getUpcoming()
        ]);

        const fetchPlatformContent = async (providerId?: string, networkId?: number) => {
          try {
            const filters = {
              sortBy: "popularity.desc",
              year: new Date().getFullYear(),
              with_watch_providers: providerId,
              with_networks: networkId
            };

            const [movies, tv] = await Promise.all([
              tmdbApi.discoverMedia({ ...filters, mediaType: "movie" }),
              tmdbApi.discoverMedia({ ...filters, mediaType: "tv" })
            ]);
            const combined = [...movies, ...tv];
            const seed = combined.reduce((acc, item) => acc + item.id * 17, 0);
            return shuffleArray(combined, seed).slice(0, 15);
          } catch (e) {
            console.error("Error fetching platform content", e);
            return [];
          }
        };

        const [netflix, hbo, prime, disney] = await Promise.all([
          fetchPlatformContent("8", undefined),
          fetchPlatformContent(undefined, 49),
          fetchPlatformContent("119", undefined),
          fetchPlatformContent("337", undefined)
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
        setNowPlayingMovies(nowPlaying);
        setUpcomingReleases(upcoming);

        setNetflixContent(netflix);
        setHboContent(hbo);
        setPrimeContent(prime);
        setDisneyContent(disney);

        localStorage.setItem("lastContentRefresh", Date.now().toString());
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

    loadContent();
  }, [toast]);

  const handleRetry = () => {
    localStorage.removeItem("lastContentRefresh");
    window.location.reload();
  };

  const recommendedSeed = useMemo(() => {
    const moviesSeed = popularMovies.reduce((acc, item) => acc + item.id * 13, 0);
    const tvSeed = popularTvShows.reduce((acc, item) => acc + item.id * 17, 0);
    return moviesSeed + tvSeed;
  }, [popularMovies, popularTvShows]);
  const recommendedContent = useMemo(() => {
    return shuffleArray([...popularMovies, ...popularTvShows], recommendedSeed).slice(0, 15);
  }, [popularMovies, popularTvShows, recommendedSeed]);
  const alCinemaItems = nowPlayingMovies;

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
      <SEO title="Catalogo" description="Esplora film e serie TV in tendenza e sulle principali piattaforme." />
      <Navbar />

      {isLoading ? (
        renderSkeletonLoader()
      ) : loadingError && trendingContent.length === 0 ? (
        <div className="h-[60vh] flex flex-col items-center justify-center gap-4">
          <p className="text-lg text-muted-foreground">{loadingError}</p>
          <p className="text-sm text-muted-foreground mb-2">
            L&apos;API key di TMDB non è valida. Controlla il file src/services/tmdbApi.ts per aggiornare con un API key valida.
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

            {hboContent.length > 0 && (
              <ContentRow
                title="In Tendenza su HBO"
                icon={
                  <OptimizedImage
                    src="https://upload.wikimedia.org/wikipedia/commons/d/de/HBO_logo.svg"
                    alt="HBO"
                    className="h-6 w-auto object-contain"
                    loading="lazy"
                  />
                }
                items={hboContent}
              />
            )}

            {netflixContent.length > 0 && (
              <ContentRow
                title="In Tendenza su Netflix"
                icon={
                  <OptimizedImage
                    src="https://upload.wikimedia.org/wikipedia/commons/0/08/Netflix_2015_logo.svg"
                    alt="Netflix"
                    className="h-6 w-auto object-contain"
                    loading="lazy"
                  />
                }
                items={netflixContent}
              />
            )}

            {primeContent.length > 0 && (
              <ContentRow
                title="In Tendenza su Prime Video"
                icon={
                  <OptimizedImage
                    src="https://upload.wikimedia.org/wikipedia/commons/f/f1/Prime_Video.png"
                    alt="Prime Video"
                    className="h-6 w-auto object-contain"
                    loading="lazy"
                  />
                }
                items={primeContent}
              />
            )}

            {disneyContent.length > 0 && (
              <ContentRow
                title="In Tendenza su Disney+"
                icon={
                  <OptimizedImage
                    src="https://upload.wikimedia.org/wikipedia/commons/3/3e/Disney%2B_logo.svg"
                    alt="Disney+"
                    className="h-6 w-auto object-contain"
                    loading="lazy"
                  />
                }
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

            {alCinemaItems.length > 0 ? (
              <ContentRow
                title="Al Cinema"
                icon={<Projector className="text-purple-500" />}
                items={alCinemaItems}
                showBadges={true}
              />
            ) : (
              <div className="mb-8">
                <div className="flex items-center gap-2 mb-3">
                  <Projector className="text-purple-500" />
                  <h2 className="text-lg font-semibold">Al Cinema</h2>
                </div>
                <p className="text-sm text-muted-foreground">
                  Nessuna nuova uscita al cinema disponibile al momento.
                </p>
              </div>
            )}

            {upcomingReleases.length > 0 && (
              <ContentRow
                title="Prossime Uscite"
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

export default Catalogo;
