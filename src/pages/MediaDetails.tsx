
import { useState, useEffect, lazy, Suspense } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Image, Film } from "lucide-react";
import { tmdbApi, MediaDetails as MediaDetailsType, MediaItem, Trailer } from "@/services/tmdbApi";
import Navbar from "@/components/Navbar";
import ContentRow from "@/components/ContentRow";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import ActorCard from "@/components/ActorCard";
const MediaReviews = lazy(() => import("@/components/MediaReviews"));
const TvSeasons = lazy(() => import("@/components/TvSeasons"));
const MediaGallery = lazy(() => import("@/components/MediaGallery"));
import { OptimizedImage } from "@/components/OptimizedImage";
// import ActorDetails from "@/components/ActorDetails"; // No longer needed here
import { useWatchlistStore } from "@/store/useWatchlistStore";
import { useLibraryStore, LibraryItem } from "@/store/useLibraryStore";
import { SEO } from "@/components/SEO";

// Sub-components
import { MediaHero } from "@/components/media/MediaHero";
import { MediaInfo } from "@/components/media/MediaInfo";
import { MediaActions } from "@/components/media/MediaActions";
const MediaTrivia = lazy(() =>
  import("@/components/media/MediaTrivia").then((mod) => ({ default: mod.MediaTrivia }))
);
const WatchProvidersDialog = lazy(() =>
  import("@/components/media/WatchProvidersDialog").then((mod) => ({ default: mod.WatchProvidersDialog }))
);
import { useAuth } from "@/context/auth-core";

const MediaDetailsPage = () => {
  const { mediaType, id } = useParams<{ mediaType: "movie" | "tv", id: string }>();
  const navigate = useNavigate();
  const [media, setMedia] = useState<MediaDetailsType | null>(null);
  const [similarContent, setSimilarContent] = useState<MediaItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showVideo, setShowVideo] = useState(false);
  const [showTrivia, setShowTrivia] = useState(false);
  const [trailers, setTrailers] = useState<Trailer[]>([]);
  const [showReviews, setShowReviews] = useState(false);
  const [showSeasons, setShowSeasons] = useState(false);
  const [showGallery, setShowGallery] = useState(false);
  // const [showActorDetails, setShowActorDetails] = useState(false); // Deprecated
  // const [selectedActorId, setSelectedActorId] = useState<number | null>(null); // Deprecated
  const [showWatchProviders, setShowWatchProviders] = useState(false);
  const [trivia, setTrivia] = useState<{ facts: string[], controversies: string[] }>({
    facts: [],
    controversies: []
  });
  const { toast } = useToast();
  const { addItem, removeItem, isInWatchlist } = useWatchlistStore();
  const { addItem: addLibraryItem, removeItem: removeLibraryItem, getItem, markMovieWatched } = useLibraryStore();
  const { canAccess } = useAuth();

  /* Background Trailer State */
  const [showBackgroundTrailer, setShowBackgroundTrailer] = useState(false);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (!isLoading && trailers.length > 0 && !showVideo) {
      timer = setTimeout(() => {
        setShowBackgroundTrailer(true);
      }, 3000); // Start after 3 seconds
    }

    return () => {
      if (timer) clearTimeout(timer);
      setShowBackgroundTrailer(false);
    };
  }, [isLoading, trailers, showVideo, id]);

  useEffect(() => {
    let isMounted = true;

    const loadDetails = async () => {
      if (!mediaType || !id) return;

      setIsLoading(true);
      setMedia(null);
      setTrailers([]);
      setSimilarContent([]);
      setShowVideo(false);
      setShowBackgroundTrailer(false);

      try {
        const details = await tmdbApi.getDetails(Number(id), mediaType);

        if (!isMounted) return;

        if (details) {
          const [similar, mediaTrailers] = await Promise.all([
            tmdbApi.getSimilar(Number(id), mediaType),
            tmdbApi.getTrailers(Number(id), mediaType)
          ]);

          if (!isMounted) return;

          setTrailers(mediaTrailers || []);
          setMedia(details);
          setSimilarContent(similar || []);

          // Generate trivia from keywords present in details
          if (details.keywords) {
            setupTrivia(details, mediaType);
          }
        }
      } catch (error) {
        if (!isMounted) return;
        console.error(`Errore nel caricamento dei dettagli ${mediaType}:`, error);
        toast({
          title: "Errore nel caricamento dei dettagli",
          description: "Riprova più tardi",
          variant: "destructive"
        });
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadDetails();

    return () => {
      isMounted = false;
    };
  }, [mediaType, id, toast]);

  const setupTrivia = (details: MediaDetailsType, type: "movie" | "tv") => {
    try {
      // Access keywords correctly based on structure
      const keywordsData = details.keywords;
      const keywords = type === "movie" ? keywordsData?.keywords : keywordsData?.results;

      if (keywords && keywords.length > 0) {
        const facts = keywords
          .filter((keyword) => Math.random() > 0.5)
          .map((keyword) => {
            const factStarters = [
              `Questo ${type === "movie" ? "film" : "show"} è noto per la tematica "${keyword.name}" che è centrale nella trama.`,
              `La produzione ha dedicato particolare attenzione all'aspetto "${keyword.name}" durante le riprese.`,
              `Critici e fan hanno apprezzato particolarmente come "${keyword.name}" sia stato rappresentato in questo ${type === "movie" ? "film" : "show"}.`,
              `Una delle scene più iconiche è legata alla tematica "${keyword.name}".`,
              `Il ${type === "movie" ? "regista" : "creatore"} ha dichiarato che "${keyword.name}" è stato uno degli elementi più complessi da portare sullo schermo.`
            ];
            return factStarters[Math.floor(Math.random() * factStarters.length)];
          });

        const controversies = [];
        if (keywords.length > 2) {
          const controversyTopics = keywords.slice(0, 2);
          for (const topic of controversyTopics) {
            const controversyStarters = [
              `La rappresentazione di "${topic.name}" ha generato dibattito tra critici e pubblico.`,
              `Alcuni gruppi hanno criticato la modalità con cui "${topic.name}" è stato affrontato nella storia.`,
              `Durante la produzione, ci sono state tensioni su come trattare il tema "${topic.name}".`,
              `In alcuni paesi, il ${type === "movie" ? "film" : "show"} ha ricevuto censure proprio per la presenza del tema "${topic.name}".`
            ];
            controversies.push(controversyStarters[Math.floor(Math.random() * controversyStarters.length)]);
          }
        }

        // Budget/Revenue facts
        if (type === "movie" && details) {
          if (details.budget && details.budget > 0) {
            facts.push(`Il budget di produzione di ${details.title || ""} è stato di ${new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(details.budget)}, considerato ${details.budget > 100000000 ? "elevato" : "nella media"} per produzioni di questo genere.`);
          }
          if (details.revenue && details.revenue > 0) {
            const profit = details.revenue - (details.budget || 0);
            facts.push(`Il film ha generato un incasso mondiale di ${new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(details.revenue)}, ${profit > 0 ? `con un profitto di circa ${new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(profit)}.` : "che non è riuscito a coprire i costi di produzione."}`);
          }
        }

        // TV Seasons facts
        if (type === "tv" && details) {
          if (details.number_of_seasons && details.number_of_episodes) {
            facts.push(`Con ${details.number_of_seasons} stagioni e ${details.number_of_episodes} episodi in totale, ${details.name || ""} è ${details.number_of_seasons > 5 ? "una delle serie più longeve" : "una serie di media durata"} nel suo genere.`);
          }
          if (details.created_by && details.created_by.length > 0) {
            facts.push(`Tra i creatori della serie figura ${details.created_by.map(creator => creator.name).join(", ")}, ${details.created_by.length > 1 ? "che hanno" : "che ha"} voluto esplorare nuovi temi televisivi.`);
          }
        }

        setTrivia({
          facts: facts.length > 0 ? facts : ["Informazioni dettagliate su questo titolo non sono attualmente disponibili."],
          controversies: controversies.length > 0 ? controversies : ["Non sono state rilevate particolari controversie legate a questo titolo."]
        });
      }
    } catch (error) {
      console.error("Errore nel setup delle curiosità:", error);
      setTrivia({
        facts: ["Informazioni dettagliate su questo titolo non sono attualmente disponibili."],
        controversies: ["Non sono state rilevate particolari controversie legate a questo titolo."]
      });
    }
  };

  const handlePlayTrailer = () => {
    if (trailers?.length) {
      setShowVideo(true);
    } else {
      toast({
        title: "Nessun trailer disponibile",
        description: "Non è stato possibile trovare un trailer per questo contenuto",
        variant: "default"
      });
    }
  };

  const handleShowReviews = () => setShowReviews(true);
  const handleShowSeasons = () => setShowSeasons(true);
  const handleShowGallery = () => setShowGallery(true);

  const buildLibraryItem = (): LibraryItem | null => {
    if (!media || !mediaType || !id) return null;
    const now = new Date().toISOString();
    const status: LibraryItem["status"] = mediaType === "tv" ? "watching" : "planned";
    return {
      id: Number(id),
      media_type: mediaType,
      title: media.title,
      name: media.name,
      poster_path: media.poster_path,
      backdrop_path: media.backdrop_path,
      release_date: media.release_date,
      first_air_date: media.first_air_date,
      status,
      addedAt: now,
      updatedAt: now
    };
  };

  const handleToggleLibrary = async () => {
    if (!mediaType || !id) return;
    const existing = getItem(Number(id), mediaType);
    if (existing) {
      await removeLibraryItem(Number(id), mediaType);
      toast({
        title: "Rimosso dallo storico",
        description: "Il contenuto è stato rimosso dal tuo storico personale."
      });
      return;
    }
    const item = buildLibraryItem();
    if (!item) return;
    await addLibraryItem(item);
    toast({
      title: "Aggiunto allo storico",
      description: "Il contenuto è stato aggiunto al tuo storico personale."
    });
  };

  const handleMarkWatched = async () => {
    if (!mediaType || mediaType !== "movie" || !id) return;
    const existing = getItem(Number(id), mediaType);
    if (!existing) {
      const now = new Date().toISOString();
      await addLibraryItem({
        id: Number(id),
        media_type: "movie",
        title: media?.title,
        poster_path: media?.poster_path,
        backdrop_path: media?.backdrop_path,
        release_date: media?.release_date,
        status: "completed",
        addedAt: now,
        updatedAt: now,
        watchedAt: now
      });
    } else {
      await markMovieWatched(Number(id));
    }
    toast({
      title: "Segnato come visto",
      description: "Il film è stato aggiornato nello storico."
    });
  };

  const handleViewActorDetails = (actorId: number) => {
    navigate(`/person/${actorId}`);
  };

  const handleAddToWatchlist = () => {
    if (!media || !mediaType || !id) return;

    const inWatchlist = isInWatchlist(Number(id), mediaType);

    if (inWatchlist) {
      removeItem(Number(id), mediaType);
      toast({
        title: "Rimosso dalla Watchlist",
        description: `${media?.title || media?.name} è stato rimosso dalla tua watchlist`,
        variant: "default"
      });
    } else {
      const watchlistItem: MediaItem = {
        id: media.id,
        title: media.title,
        name: media.name,
        poster_path: media.poster_path,
        backdrop_path: media.backdrop_path,
        media_type: mediaType,
        vote_average: media.vote_average,
        overview: media.overview,
        popularity: media.popularity,
        vote_count: media.vote_count,
        release_date: media.release_date,
        first_air_date: media.first_air_date,
        genre_ids: media.genres?.map(g => g.id) || [],
      };

      addItem(watchlistItem);
      toast({
        title: "Aggiunto alla Watchlist",
        description: `${media?.title || media?.name} è stato aggiunto alla tua watchlist`,
        variant: "default"
      });
    }
  };

  const handleShare = () => {
    // Keep share logic simple for now or move to util
    if (navigator.share) {
      navigator.share({
        title: media?.title || media?.name,
        text: `Guarda ${media?.title || media?.name} su FilmFlare!`,
        url: window.location.href,
      }).catch(console.error);
    } else {
      toast({
        title: "Condivisione",
        description: "Condivisione non supportata su questo browser. Link copiato.",
      });
      navigator.clipboard.writeText(window.location.href);
    }
  };

  const handleShowTrivia = () => setShowTrivia(!showTrivia);
  const handleWatchNow = () => setShowWatchProviders(true);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <Navbar />
        <div className="h-[60vh] bg-secondary/20 animate-pulse flex items-center justify-center">Caricamento dettagli...</div>
      </div>
    );
  }

  if (!media) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <Navbar />
        <div className="h-[60vh] flex items-center justify-center flex-col">
          <h2 className="text-2xl mb-4">Contenuto non trovato</h2>
          <Link to="/" className="text-accent hover:underline">Torna alla Homepage</Link>
        </div>
      </div>
    );
  }

  const backdropUrl = tmdbApi.getImageUrl(media.backdrop_path, "original");
  const posterUrl = tmdbApi.getImageUrl(media.poster_path, "w500");
  const title = mediaType === "movie" ? media.title : media.name;
  const releaseDate = mediaType === "movie" ? media.release_date : media.first_air_date;
  const releaseYear = releaseDate ? new Date(releaseDate).getFullYear().toString() : "";

  const trailer = trailers?.length > 0 ? trailers[0] : null;

  // Runtime String
  const getRuntimeString = () => {
    if (mediaType === "movie" && media.runtime) {
      const hours = Math.floor(media.runtime / 60);
      const minutes = media.runtime % 60;
      return `${hours}h ${minutes}m`;
    } else if (mediaType === "tv" && media.episode_run_time?.length) {
      const avgRuntime = media.episode_run_time[0];
      const hours = Math.floor(avgRuntime / 60);
      const minutes = avgRuntime % 60;
      return `${hours ? `${hours}h ` : ''}${minutes}m per episodio`;
    }
    return "Durata sconosciuta";
  };

  const mainCast = media.credits?.cast?.slice(0, 8) || [];
  const director = mediaType === "movie"
    ? media.credits?.crew?.find(person => person.job === "Director")
    : null;
  const creators = mediaType === "tv" ? media.created_by : null;
  const nextEpisode = mediaType === "tv" ? media.next_episode_to_air : undefined;

  const formatInfoDate = (value?: string) => {
    if (!value) return "—";
    return new Date(value).toLocaleDateString("it-IT", {
      year: "numeric",
      month: "long",
      day: "numeric"
    });
  };

  const tvInfoItems = mediaType === "tv" ? [
    { label: "Prossimo episodio", value: nextEpisode?.air_date ? formatInfoDate(nextEpisode.air_date) : "—" },
    { label: "Anno", value: releaseYear || "—" },
    { label: "Stato", value: media.status || "—" },
    { label: "Canale", value: media.networks?.[0]?.name || "—" },
    { label: "Stagioni", value: media.number_of_seasons ? String(media.number_of_seasons) : "—" },
    { label: "Episodi", value: media.number_of_episodes ? String(media.number_of_episodes) : "—" },
    { label: "Voto", value: media.vote_average ? `${media.vote_average.toFixed(1)} (${media.vote_count})` : "—" }
  ] : [];

  return (
    <div className="min-h-screen bg-background text-foreground">
      {media && (
        <SEO
          title={title || "Dettagli Media"}
          description={media.overview?.substring(0, 160) || `Scopri tutto su ${title}`}
          image={backdropUrl}
          type={mediaType === "movie" ? "video.movie" : "video.tv_show"}
        />
      )}
      <Navbar />

      <MediaHero
        backdropUrl={backdropUrl}
        title={title || ""}
        trailer={trailer}
        showBackgroundTrailer={showBackgroundTrailer}
        showVideo={showVideo}
        setShowVideo={setShowVideo}
      />

      {/* Modals */}
      {showReviews && id && mediaType && (
        <Suspense fallback={null}>
          <MediaReviews mediaId={Number(id)} mediaType={mediaType} onClose={() => setShowReviews(false)} />
        </Suspense>
      )}
      {showSeasons && id && mediaType === "tv" && (
        <Suspense fallback={null}>
          <TvSeasons tvId={Number(id)} onClose={() => setShowSeasons(false)} />
        </Suspense>
      )}
      {showGallery && id && mediaType && (
        <Suspense fallback={null}>
          <MediaGallery mediaId={Number(id)} mediaType={mediaType} onClose={() => setShowGallery(false)} />
        </Suspense>
      )}
      {/* Actor Modal Removed in favor of dedicated page */}

      <Suspense fallback={null}>
        <WatchProvidersDialog
          open={showWatchProviders}
          onOpenChange={setShowWatchProviders}
          title={title || ""}
          media={media}
        />
      </Suspense>

      {/* Main Content */}
      <main className="max-w-screen-xl mx-auto px-4 md:px-8 -mt-32 lg:-mt-64 relative z-10">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Poster */}
          <div className="w-full lg:w-1/4 flex-shrink-0">
            <div className="rounded-lg overflow-hidden border-2 border-muted/20 shadow-xl">
              <OptimizedImage src={posterUrl} alt={title || ""} className="w-full aspect-[2/3] object-cover" loading="lazy" />
            </div>
          </div>

          {/* Details */}
          <div className="w-full lg:w-3/4">
            <MediaInfo
              media={media}
              title={title || ""}
              releaseYear={releaseYear}
              releaseDate={releaseDate}
              runtimeString={getRuntimeString()}
            />

            <MediaActions
              onWatchNow={handleWatchNow}
              onPlayTrailer={handlePlayTrailer}
              onShowReviews={handleShowReviews}
              onShowSeasons={handleShowSeasons}
              onAddToWatchlist={handleAddToWatchlist}
              onToggleLibrary={handleToggleLibrary}
              onMarkWatched={handleMarkWatched}
              onShare={handleShare}
              onShowGallery={handleShowGallery}
              onShowTrivia={handleShowTrivia}
              mediaType={mediaType}
              isInWatchlist={id ? isInWatchlist(Number(id), mediaType) : false}
              isInLibrary={id ? !!getItem(Number(id), mediaType) : false}
              isLoggedIn={canAccess}
            />

            {mediaType === "tv" && (
              <div className="mb-8 space-y-6">
                <div className="bg-secondary/20 rounded-lg p-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {tvInfoItems.map((item) => (
                      <div key={item.label} className="text-sm">
                        <div className="text-muted-foreground">{item.label}</div>
                        <div className="font-semibold">{item.value}</div>
                      </div>
                    ))}
                  </div>
                </div>
                <Suspense fallback={null}>
                  <TvSeasons tvId={Number(id)} variant="inline" />
                </Suspense>
              </div>
            )}

            {/* Overview */}
            <div className="mb-8">
              <h2 className="text-xl font-semibold mb-3">Panoramica</h2>
              <p className="text-muted-foreground">{media.overview}</p>
            </div>

            {/* AI Trivia */}
            <Suspense fallback={null}>
              <MediaTrivia
                trivia={trivia}
                showTrivia={showTrivia}
                onToggleTrivia={handleShowTrivia}
              />
            </Suspense>

            {/* Credits */}
            <div className="mb-8 mt-8">
              <h2 className="text-xl font-semibold mb-3">Crediti</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  {director && (
                    <div className="mb-2">
                      <span className="text-sm text-muted-foreground">Regista:</span>
                      <p>{director.name}</p>
                    </div>
                  )}
                  {creators?.length > 0 && (
                    <div className="mb-2">
                      <span className="text-sm text-muted-foreground">Creato da:</span>
                      <p>{creators?.map(c => c.name).join(", ")}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Actors */}
            <div className="mb-8">
              <h2 className="text-xl font-semibold mb-3">Attori Protagonisti</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {mainCast.map(actor => (
                  <div key={actor.id} onClick={() => handleViewActorDetails(actor.id)} className="cursor-pointer transition-transform hover:scale-105">
                    <ActorCard actor={actor} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Gallery Preview Button Section (Moved to Actions or kept here? The original had a dedicated section) */}
        <div className="mt-12">
          <h2 className="text-2xl font-bold mb-6 flex items-center">
            <Image className="mr-2" />
            Poster e Immagini
          </h2>
          <div className="flex flex-nowrap overflow-x-auto gap-4 pb-4">
            <Button variant="outline" className="h-auto p-2" onClick={handleShowGallery}>
              <div className="w-40 h-24 rounded bg-secondary/20 flex items-center justify-center">
                <Image className="h-8 w-8 opacity-50" />
              </div>
              <p className="mt-2 text-sm">Vedi Galleria</p>
            </Button>
          </div>
        </div>

        {/* Trailers section */}
        {trailers && trailers.length > 0 && (
          <div className="mt-12">
            <h2 className="text-2xl font-bold mb-6 flex items-center">
              <Film className="mr-2" />
              Trailer e Video
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {trailers.slice(0, 2).map((trailer) => (
                <div key={trailer.id} className="aspect-video bg-black rounded-lg overflow-hidden">
                  <iframe
                    width="100%"
                    height="100%"
                    src={`https://www.youtube.com/embed/${trailer.key}`}
                    title={trailer.name}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    className="w-full h-full"
                  ></iframe>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Similar content */}
        {similarContent.length > 0 && (
          <div className="mt-12">
            <ContentRow title={`Contenuti simili a ${title}`} items={similarContent} />
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default MediaDetailsPage;
