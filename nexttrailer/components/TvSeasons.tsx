
import React, { useState, useEffect } from "react";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { ChevronDown, ChevronUp, Clock, Calendar } from "lucide-react";
import { tmdbApi } from "@/services/tmdbApi";
import { Button } from "@/components/ui/button";
import { fetchWithRetry, API_URL } from "@/services/api/config";
import { useLibraryStore } from "@/store/useLibraryStore";
import { useAuth } from "@/context/auth-core";
import { OptimizedImage } from "@/components/OptimizedImage";

interface Episode {
  id: number;
  name: string;
  overview: string;
  still_path: string | null;
  air_date: string;
  episode_number: number;
  runtime: number | null;
  vote_average: number;
}

interface Season {
  id: number;
  name: string;
  overview: string;
  poster_path: string | null;
  season_number: number;
  air_date: string;
  episode_count: number;
  episodes?: Episode[];
}

interface TvSeasonsProps {
  tvId: number;
  onClose?: () => void;
  variant?: "modal" | "inline";
}

const TvSeasons = ({ tvId, onClose, variant = "modal" }: TvSeasonsProps) => {
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedSeasons, setExpandedSeasons] = useState<number[]>([]);
  const [loadingSeasonDetails, setLoadingSeasonDetails] = useState<number | null>(null);
  const [tvName, setTvName] = useState<string>("");
  const [tvPoster, setTvPoster] = useState<string | null>(null);
  const [tvBackdrop, setTvBackdrop] = useState<string | null>(null);
  const [tvFirstAirDate, setTvFirstAirDate] = useState<string | null>(null);
  const { toggleEpisodeWatched, setSeasonWatched, isEpisodeWatched, addItem, getItem } = useLibraryStore();
  const { canAccess } = useAuth();

  useEffect(() => {
    const fetchSeasons = async () => {
      setIsLoading(true);
      try {
        const response = await fetchWithRetry(
          `${API_URL}/tv/${tvId}?language=it-IT`
        );
        
        if (!response.ok) {
          throw new Error("Errore nel caricamento delle stagioni");
        }
        
        const data = await response.json();
        
        if (data.seasons) {
          // Filtra eventuali stagioni speciali (come "Specials" con season_number = 0)
          const filteredSeasons = data.seasons.filter((season: Season) => season.season_number > 0);
          setSeasons(filteredSeasons);
          setTvName(data.name || "");
          setTvPoster(data.poster_path || null);
          setTvBackdrop(data.backdrop_path || null);
          setTvFirstAirDate(data.first_air_date || null);
        }
      } catch (err) {
        console.error("Errore nel caricamento delle stagioni:", err);
        setError("Impossibile caricare le stagioni. Riprova più tardi.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchSeasons();
  }, [tvId]);

  const toggleSeason = async (seasonNumber: number) => {
    if (expandedSeasons.includes(seasonNumber)) {
      setExpandedSeasons(expandedSeasons.filter(sn => sn !== seasonNumber));
      return;
    }
    
    // Verifica se gli episodi sono già stati caricati
    const season = seasons.find(s => s.season_number === seasonNumber);
    if (season && !season.episodes) {
      setLoadingSeasonDetails(seasonNumber);
      try {
        const response = await fetchWithRetry(
          `${API_URL}/tv/${tvId}/season/${seasonNumber}?language=it-IT`
        );
        
        if (!response.ok) {
          throw new Error("Errore nel caricamento degli episodi");
        }
        
        const seasonData = await response.json();
        
        // Aggiorna la stagione con gli episodi caricati
        setSeasons(seasons.map(s => 
          s.season_number === seasonNumber ? { ...s, episodes: seasonData.episodes } : s
        ));
      } catch (err) {
        console.error(`Errore nel caricamento degli episodi per la stagione ${seasonNumber}:`, err);
      } finally {
        setLoadingSeasonDetails(null);
      }
    }
    
    setExpandedSeasons([...expandedSeasons, seasonNumber]);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Data sconosciuta";
    const date = new Date(dateString);
    return date.toLocaleDateString("it-IT", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatRuntime = (minutes: number | null) => {
    if (!minutes) return "Durata sconosciuta";
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes > 0 ? `${remainingMinutes}m` : ''}`;
  };

  const getWatchedCount = (seasonNumber: number) => {
    const item = getItem(tvId, "tv");
    if (!item?.episodeProgress) return 0;
    return (item.episodeProgress[String(seasonNumber)] || []).length;
  };

  const handleToggleEpisode = async (seasonNumber: number, episodeNumber: number) => {
    const existing = getItem(tvId, "tv");
    if (!existing) {
      const now = new Date().toISOString();
      await addItem({
        id: tvId,
        media_type: "tv",
        name: tvName,
        poster_path: tvPoster,
        backdrop_path: tvBackdrop,
        first_air_date: tvFirstAirDate || undefined,
        status: "watching",
        addedAt: now,
        updatedAt: now
      });
    }
    await toggleEpisodeWatched(tvId, seasonNumber, episodeNumber);
  };

  const handleMarkSeasonWatched = async (season: Season) => {
    if (!season.episodes || season.episodes.length === 0) return;
    const episodeNumbers = season.episodes
      .map((episode) => episode.episode_number)
      .filter((episodeNumber) => typeof episodeNumber === "number");
    if (episodeNumbers.length === 0) return;
    const existing = getItem(tvId, "tv");
    if (!existing) {
      const now = new Date().toISOString();
      await addItem({
        id: tvId,
        media_type: "tv",
        name: tvName,
        poster_path: tvPoster,
        backdrop_path: tvBackdrop,
        first_air_date: tvFirstAirDate || undefined,
        status: "watching",
        addedAt: now,
        updatedAt: now
      });
    }
    await setSeasonWatched(tvId, season.season_number, episodeNumbers);
  };

  const isSeasonFullyWatched = (season: Season) => {
    if (!season.episodes || season.episodes.length === 0) return false;
    return season.episodes.every((episode) =>
      isEpisodeWatched(tvId, season.season_number, episode.episode_number)
    );
  };

  const content = (
    <>
      <h2 className={`text-2xl font-bold mb-6 ${variant === "modal" ? "text-white" : ""}`}>
        Stagioni ed Episodi
      </h2>

      {isLoading ? (
        <div className="flex justify-center p-10">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-accent"></div>
        </div>
      ) : error ? (
        <div className="bg-destructive/20 p-4 rounded-md">
          <p className="text-destructive-foreground">{error}</p>
        </div>
      ) : seasons.length === 0 ? (
        <div className="bg-secondary/20 p-6 rounded-md text-center">
          <p>Nessuna informazione disponibile sulle stagioni</p>
        </div>
      ) : (
        <div className="space-y-4">
          {seasons.map((season) => (
            <Collapsible 
              key={season.id}
              open={expandedSeasons.includes(season.season_number)}
              onOpenChange={() => toggleSeason(season.season_number)}
              className="bg-secondary/20 border border-secondary/30 rounded-lg overflow-hidden"
            >
              <CollapsibleTrigger asChild>
                <div className="flex items-center p-4 cursor-pointer hover:bg-secondary/30 transition-colors">
                  <div className="flex-shrink-0 w-16 h-24 mr-4 overflow-hidden rounded">
                    {season.poster_path ? (
                      <OptimizedImage
                        src={tmdbApi.getImageUrl(season.poster_path, "w185")}
                        alt={season.name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full bg-secondary/50 flex items-center justify-center">
                        <span>No img</span>
                      </div>
                    )}
                  </div>
                  <div className="flex-grow">
                    <h3 className="font-medium text-lg">{season.name}</h3>
                    <div className="flex flex-wrap gap-x-4 text-sm text-muted-foreground mt-1">
                      <span className="flex items-center">
                        <Calendar className="h-3.5 w-3.5 mr-1" />
                        {formatDate(season.air_date)}
                      </span>
                      <span>{season.episode_count} episodi</span>
                      <span>{getWatchedCount(season.season_number)}/{season.episode_count} visti</span>
                    </div>
                    {season.overview && <p className="text-sm mt-2 line-clamp-2">{season.overview}</p>}
                  </div>
                  <div className="ml-4 flex items-center gap-2">
                    {canAccess && season.episodes && (
                      <Button
                        variant={isSeasonFullyWatched(season) ? "default" : "outline"}
                        className="h-8 px-3 text-xs"
                        onClick={(event) => {
                          event.stopPropagation();
                          handleMarkSeasonWatched(season);
                        }}
                        disabled={isSeasonFullyWatched(season)}
                      >
                        {isSeasonFullyWatched(season) ? "Stagione vista" : "Segna stagione vista"}
                      </Button>
                    )}
                    {loadingSeasonDetails === season.season_number ? (
                      <div className="w-6 h-6 animate-spin rounded-full border-t-2 border-b-2 border-accent"></div>
                    ) : expandedSeasons.includes(season.season_number) ? (
                      <ChevronUp className="h-6 w-6" />
                    ) : (
                      <ChevronDown className="h-6 w-6" />
                    )}
                  </div>
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="border-t border-secondary/30">
                  {season.episodes ? (
                    <div className="divide-y divide-secondary/20">
                      {season.episodes.map((episode) => (
                        <div key={episode.id} className="p-3 hover:bg-secondary/30">
                          <div className="flex items-center">
                            <div className="w-12 text-center font-medium text-accent">
                              {episode.episode_number}
                            </div>
                            <div className="flex-grow">
                              <h4 className="font-medium">{episode.name}</h4>
                              <div className="flex flex-wrap gap-x-4 text-xs text-muted-foreground mt-1">
                                {episode.air_date && (
                                  <span className="flex items-center">
                                    <Calendar className="h-3 w-3 mr-1" />
                                    {formatDate(episode.air_date)}
                                  </span>
                                )}
                                {episode.runtime && (
                                  <span className="flex items-center">
                                    <Clock className="h-3 w-3 mr-1" />
                                    {formatRuntime(episode.runtime)}
                                  </span>
                                )}
                              </div>
                              {episode.overview && <p className="text-xs mt-2 line-clamp-2">{episode.overview}</p>}
                            </div>
                            {canAccess && (
                              <div className="ml-2">
                                <Button
                                  variant={isEpisodeWatched(tvId, season.season_number, episode.episode_number) ? "default" : "outline"}
                                  className="h-8 px-3 text-xs"
                                  onClick={() => handleToggleEpisode(season.season_number, episode.episode_number)}
                                >
                                  {isEpisodeWatched(tvId, season.season_number, episode.episode_number) ? "Visto" : "Segna visto"}
                                </Button>
                              </div>
                            )}
                            {episode.still_path && (
                              <div className="flex-shrink-0 w-24 h-14 ml-2 overflow-hidden rounded">
                                <OptimizedImage
                                  src={tmdbApi.getImageUrl(episode.still_path, "w185")}
                                  alt={episode.name}
                                  className="w-full h-full object-cover"
                                  loading="lazy"
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 text-center text-muted-foreground">
                      Caricamento degli episodi...
                    </div>
                  )}
                </div>
              </CollapsibleContent>
            </Collapsible>
          ))}
        </div>
      )}
    </>
  );

  if (variant === "inline") {
    return <div className="bg-secondary/20 rounded-lg p-4">{content}</div>;
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/90 overflow-y-auto">
      <div className="max-w-4xl mx-auto p-4 pt-16">
        {onClose && (
          <Button 
            className="absolute top-4 right-4 bg-red-600 hover:bg-red-700 text-white" 
            onClick={onClose}
          >
            <ChevronUp className="h-4 w-4 mr-2" />
            Chiudi
          </Button>
        )}
        {content}
      </div>
    </div>
  );
};

export default TvSeasons;
