import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { DayContentProps } from "react-day-picker";
import { CalendarDays, Film, Trash2, Tv, CheckCircle2 } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import MovieCard from "@/components/MovieCard";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { useLibraryStore, LibraryItem, LibraryStatus } from "@/store/useLibraryStore";
import { useToast } from "@/hooks/use-toast";
import { tmdbApi, MediaItem } from "@/services/tmdbApi";
import { API_URL, fetchWithRetry } from "@/services/api/config";
import { useAuth } from "@/context/auth-core";

type LibraryEvent = {
  id: number;
  media_type: "movie" | "tv";
  date: string;
  title: string;
  kind: "release" | "episode";
};

const toMediaItem = (item: LibraryItem): MediaItem => {
  return {
    id: item.id,
    title: item.title,
    name: item.name,
    poster_path: item.poster_path || null,
    backdrop_path: item.backdrop_path || null,
    media_type: item.media_type,
    vote_average: 0,
    overview: "",
    popularity: 0,
    vote_count: 0,
    release_date: item.release_date,
    first_air_date: item.first_air_date,
    genre_ids: []
  };
};

const toDateKey = (value: string | Date) => {
  const date = typeof value === "string" ? new Date(value) : value;
  return date.toISOString().slice(0, 10);
};

const statusLabels: Record<LibraryStatus, string> = {
  planned: "Da vedere",
  watching: "In visione",
  completed: "Completato",
  dropped: "Abbandonato"
};

const Library = () => {
  const { items, removeItem, updateStatus, markMovieWatched } = useLibraryStore();
  const { toast } = useToast();
  const { user, canAccess, signInWithGoogle, sendVerificationEmail } = useAuth();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [events, setEvents] = useState<LibraryEvent[]>([]);
  const [isLoadingEvents, setIsLoadingEvents] = useState(false);
  const [statusFilter, setStatusFilter] = useState<"all" | LibraryStatus>("all");
  const [typeFilter, setTypeFilter] = useState<"all" | "movie" | "tv">("all");
  const [watchedHours, setWatchedHours] = useState(0);
  const [isLoadingWatchedHours, setIsLoadingWatchedHours] = useState(false);
  const [tvTotals, setTvTotals] = useState<Record<number, number>>({});

  useEffect(() => {
    const loadEvents = async () => {
      if (items.length === 0) {
        setEvents([]);
        return;
      }
      setIsLoadingEvents(true);
      const todayKey = toDateKey(new Date());
      const collected: LibraryEvent[] = [];
      const followedTv = items.filter(
        (item) =>
          item.media_type === "tv" && (item.status === "watching" || item.status === "planned")
      );
      await Promise.all(
        followedTv.map(async (item) => {
          try {
            const details = await tmdbApi.getDetails(item.id, item.media_type);
            const title = details.title || details.name || item.title || item.name || "Titolo";
            const nextEpisode = (details as {
              next_episode_to_air?: { air_date?: string; season_number?: number; episode_number?: number };
            }).next_episode_to_air;
            const seasonNumber = nextEpisode?.season_number;
            if (!seasonNumber) {
              return;
            }
            const seasonResponse = await fetchWithRetry(
              `${API_URL}/tv/${item.id}/season/${seasonNumber}?language=it-IT`
            );
            if (!seasonResponse.ok) {
              return;
            }
            const seasonData = await seasonResponse.json();
            const episodes = Array.isArray(seasonData.episodes) ? seasonData.episodes : [];
            episodes.forEach((episode: { air_date?: string; episode_number?: number; name?: string }) => {
              if (!episode.air_date) return;
              if (toDateKey(episode.air_date) < todayKey) return;
              const episodeNumber = episode.episode_number ?? 0;
              const episodeLabel = episode.name ? ` · ${episode.name}` : "";
              collected.push({
                id: item.id,
                media_type: "tv",
                date: episode.air_date,
                title: `${title} S${seasonNumber}E${episodeNumber}${episodeLabel}`,
                kind: "episode"
              });
            });
            if (episodes.length === 0 && nextEpisode?.air_date) {
              const nextEpisodeNumber = nextEpisode.episode_number ?? 0;
              collected.push({
                id: item.id,
                media_type: "tv",
                date: nextEpisode.air_date,
                title: `${title} S${seasonNumber}E${nextEpisodeNumber}`,
                kind: "episode"
              });
            }
          } catch {
            return;
          }
        })
      );
      setEvents(collected);
      setIsLoadingEvents(false);
    };
    loadEvents();
  }, [items]);

  useEffect(() => {
    let isMounted = true;
    const loadWatchedHours = async () => {
      const tvItems = items.filter((item) => item.media_type === "tv" && item.episodeProgress);
      if (tvItems.length === 0) {
        setWatchedHours(0);
        return;
      }
      setIsLoadingWatchedHours(true);
      let totalMinutes = 0;
      const cache = new Map<string, { episode_number?: number; runtime?: number }[]>();
      await Promise.all(
        tvItems.map(async (item) => {
          const progress = item.episodeProgress || {};
          const seasonEntries = Object.entries(progress);
          await Promise.all(
            seasonEntries.map(async ([seasonKey, watchedEpisodes]) => {
              const cacheKey = `${item.id}-${seasonKey}`;
              let episodes = cache.get(cacheKey);
              if (!episodes) {
                const seasonResponse = await fetchWithRetry(
                  `${API_URL}/tv/${item.id}/season/${seasonKey}?language=it-IT`
                );
                if (!seasonResponse.ok) {
                  return;
                }
                const seasonData = await seasonResponse.json();
                episodes = Array.isArray(seasonData.episodes) ? seasonData.episodes : [];
                cache.set(cacheKey, episodes);
              }
              const watchedSet = new Set(watchedEpisodes);
              episodes.forEach((episode) => {
                if (!episode.episode_number) return;
                if (!watchedSet.has(episode.episode_number)) return;
                totalMinutes += episode.runtime ?? 0;
              });
            })
          );
        })
      );
      if (isMounted) {
        setWatchedHours(Math.round((totalMinutes / 60) * 10) / 10);
        setIsLoadingWatchedHours(false);
      }
    };
    loadWatchedHours();
    return () => {
      isMounted = false;
    };
  }, [items]);

  useEffect(() => {
    let isMounted = true;
    const loadTotals = async () => {
      const tvItems = items.filter((item) => item.media_type === "tv");
      if (tvItems.length === 0) {
        if (Object.keys(tvTotals).length > 0) {
          setTvTotals({});
        }
        return;
      }
      const missing = tvItems.filter((item) => tvTotals[item.id] === undefined);
      if (missing.length === 0) return;
      const results = await Promise.all(
        missing.map(async (item) => {
          try {
            const details = await tmdbApi.getDetails(item.id, "tv");
            const total = (details as { number_of_episodes?: number }).number_of_episodes;
            return { id: item.id, total };
          } catch {
            return { id: item.id, total: undefined };
          }
        })
      );
      if (!isMounted) return;
      setTvTotals((prev) => {
        const next = { ...prev };
        results.forEach(({ id, total }) => {
          if (typeof total === "number" && Number.isFinite(total)) {
            next[id] = total;
          }
        });
        return next;
      });
    };
    loadTotals();
    return () => {
      isMounted = false;
    };
  }, [items, tvTotals]);

  const handleRemove = async (item: LibraryItem) => {
    await removeItem(item.id, item.media_type);
    toast({
      title: "Rimosso dallo storico",
      description: `${item.title || item.name || "Contenuto"} è stato rimosso dallo storico`
    });
  };

  const handleStatusChange = async (item: LibraryItem, status: LibraryStatus) => {
    await updateStatus(item.id, item.media_type, status);
    toast({
      title: "Stato aggiornato",
      description: `${item.title || item.name || "Contenuto"} ora è ${statusLabels[status]}`
    });
  };

  const handleMarkWatched = async (item: LibraryItem) => {
    await markMovieWatched(item.id);
    toast({
      title: "Segnato come visto",
      description: `${item.title || item.name || "Film"} è stato aggiornato`
    });
  };

  const getWatchedCountForItem = (item: LibraryItem) => {
    if (item.media_type !== "tv" || !item.episodeProgress) return 0;
    return Object.values(item.episodeProgress).flat().length;
  };

  const movieCount = items.filter((item) => item.media_type === "movie").length;
  const tvCount = items.filter((item) => item.media_type === "tv").length;
  const watchedEpisodesCount = items.reduce((total, item) => {
    if (item.media_type !== "tv" || !item.episodeProgress) return total;
    const episodes = Object.values(item.episodeProgress).flat();
    return total + episodes.length;
  }, 0);

  const filteredItems = items.filter((item) => {
    const statusMatch = statusFilter === "all" ? true : item.status === statusFilter;
    const typeMatch = typeFilter === "all" ? true : item.media_type === typeFilter;
    return statusMatch && typeMatch;
  });

  const selectedKey = selectedDate ? toDateKey(selectedDate) : "";
  const eventsForSelected = selectedKey
    ? events.filter((event) => toDateKey(event.date) === selectedKey)
    : [];

  const eventDates = useMemo(() => {
    return events.map((event) => new Date(event.date));
  }, [events]);

  const eventsByDate = useMemo(() => {
    return events.reduce<Record<string, LibraryEvent[]>>((acc, event) => {
      const key = toDateKey(event.date);
      if (!acc[key]) acc[key] = [];
      acc[key].push(event);
      return acc;
    }, {});
  }, [events]);

  if (!canAccess) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <Navbar />
        <main className="max-w-screen-xl mx-auto px-4 md:px-8 py-20">
          <div className="text-center max-w-xl mx-auto">
            <h1 className="text-3xl md:text-4xl font-bold mb-4">
              {user ? "Verifica la tua email" : "Il Mio Storico"}
            </h1>
            <p className="text-muted-foreground mb-6">
              {user
                ? "Controlla la tua casella di posta e conferma l'account per accedere allo storico."
                : "Accedi per visualizzare lo storico personale, le serie seguite e gli episodi segnati."}
            </p>
            <Button
              onClick={() => (user ? sendVerificationEmail() : signInWithGoogle())}
              className="bg-accent hover:bg-accent/90 text-white font-medium px-6 h-11"
            >
              {user ? "Invia email di verifica" : "Accedi"}
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />

      <main className="max-w-screen-xl mx-auto px-4 md:px-8 py-8">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold mb-2">Il Mio Storico</h1>
              <p className="text-muted-foreground">
                {items.length === 0
                  ? "Il tuo storico è vuoto"
                  : `${items.length} ${items.length === 1 ? "elemento" : "elementi"} salvati`}
              </p>
            </div>
          </div>

          {items.length > 0 && (
            <div className="flex gap-4 flex-wrap">
              <div className="bg-secondary/20 rounded-lg px-4 py-2 flex items-center gap-2">
                <Film className="h-4 w-4 text-accent" />
                <span className="text-sm">
                  <strong>{movieCount}</strong> {movieCount === 1 ? "Film" : "Film"}
                </span>
              </div>
              <div className="bg-secondary/20 rounded-lg px-4 py-2 flex items-center gap-2">
                <Tv className="h-4 w-4 text-accent" />
                <span className="text-sm">
                  <strong>{tvCount}</strong> {tvCount === 1 ? "Serie TV" : "Serie TV"}
                </span>
              </div>
            </div>
          )}
        </div>

        {items.length === 0 ? (
          <div className="text-center py-16">
            <div className="mb-6">
              <Film className="h-16 w-16 mx-auto text-muted-foreground/50" />
            </div>
            <h2 className="text-2xl font-semibold mb-2">Nessun contenuto salvato</h2>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Aggiungi film e serie TV allo storico per monitorare cosa stai guardando
            </p>
            <Link to="/">
              <Button className="gap-2">
                <Film className="h-4 w-4" />
                Esplora contenuti
              </Button>
            </Link>
          </div>
        ) : (
          <>
            <div className="bg-secondary/20 rounded-2xl p-6 mb-8">
              <div className="flex items-center gap-3 mb-6">
                <CalendarDays className="h-6 w-6 text-accent" />
                <h2 className="text-2xl font-semibold">Calendario episodi</h2>
              </div>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                modifiers={{ hasEvent: eventDates }}
                className="w-full"
                components={{
                  DayContent: ({ date }: DayContentProps) => {
                    const dayEvents = eventsByDate[toDateKey(date)] ?? [];
                    const visibleEvents = dayEvents.slice(0, 2);
                    const extraCount = dayEvents.length - visibleEvents.length;
                    return (
                      <div className="flex h-full w-full flex-col gap-2">
                        <span className="text-base md:text-lg font-semibold">{date.getDate()}</span>
                        <div className="flex flex-col gap-1 text-[0.7rem] md:text-xs font-normal text-muted-foreground">
                          {visibleEvents.map((event) => (
                            <span
                              key={`${event.media_type}-${event.id}-${event.date}`}
                              className="line-clamp-2 text-foreground"
                            >
                              {event.title}
                            </span>
                          ))}
                          {extraCount > 0 && (
                            <span className="text-muted-foreground">+{extraCount} altri</span>
                          )}
                        </div>
                      </div>
                    );
                  }
                }}
                classNames={{
                  months: "flex w-full flex-col",
                  month: "w-full space-y-4",
                  caption: "flex items-center justify-center relative",
                  caption_label: "text-2xl md:text-3xl font-semibold tracking-wide",
                  nav: "flex items-center gap-2",
                  nav_button: "h-9 w-9 rounded-full border border-input bg-background/60 hover:bg-background",
                  nav_button_previous: "absolute left-2",
                  nav_button_next: "absolute right-2",
                  table: "w-full border-collapse",
                  head_row: "grid grid-cols-7 gap-2",
                  head_cell:
                    "text-muted-foreground text-sm md:text-base font-medium text-center py-2",
                  row: "grid grid-cols-7 gap-2 mt-2",
                  cell:
                    "h-20 md:h-24 lg:h-28 w-full text-left align-top p-0 relative rounded-xl border border-secondary/40 bg-background/60",
                  day:
                    "h-full w-full flex items-start justify-start rounded-xl px-3 py-2 aria-selected:bg-accent aria-selected:text-accent-foreground",
                  day_selected:
                    "bg-accent text-accent-foreground hover:bg-accent hover:text-accent-foreground",
                  day_today: "bg-secondary/50 text-foreground",
                  day_outside:
                    "text-muted-foreground/50 bg-background/30 aria-selected:bg-background/40",
                  day_disabled: "text-muted-foreground/50",
                  day_hidden: "invisible"
                }}
                modifiersClassNames={{
                  hasEvent:
                    "relative after:absolute after:bottom-2 after:left-3 after:h-2 after:w-2 after:rounded-full after:bg-accent"
                }}
              />
            </div>

            <div className="bg-secondary/20 rounded-2xl p-6 mb-8">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-4">
                <div>
                  <p className="text-lg font-semibold">{tvCount}</p>
                  <p className="text-xs text-muted-foreground">Serie seguite</p>
                </div>
                <div>
                  <p className="text-lg font-semibold">{watchedEpisodesCount}</p>
                  <p className="text-xs text-muted-foreground">Episodi visti</p>
                </div>
                <div>
                  <p className="text-lg font-semibold">
                    {isLoadingWatchedHours ? "..." : watchedHours}
                  </p>
                  <p className="text-xs text-muted-foreground">Ore passate sulle serie</p>
                </div>
                <div>
                  <p className="text-lg font-semibold">0</p>
                  <p className="text-xs text-muted-foreground">Commenti</p>
                </div>
                <div>
                  <p className="text-lg font-semibold">0</p>
                  <p className="text-xs text-muted-foreground">Serie votate</p>
                </div>
                <div>
                  <p className="text-lg font-semibold">0</p>
                  <p className="text-xs text-muted-foreground">Utenti seguiti</p>
                </div>
                <div>
                  <p className="text-lg font-semibold">0</p>
                  <p className="text-xs text-muted-foreground">Seguono il profilo</p>
                </div>
              </div>
            </div>

            <div className="bg-secondary/20 rounded-2xl p-6 mb-10">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold">Uscite del giorno</h3>
                  <p className="text-sm text-muted-foreground">
                    {selectedDate
                      ? new Date(selectedDate).toLocaleDateString("it-IT", {
                          weekday: "long",
                          day: "2-digit",
                          month: "long",
                          year: "numeric"
                        })
                      : "Seleziona una data"}
                  </p>
                </div>
              </div>
              {isLoadingEvents ? (
                <div className="text-sm text-muted-foreground">Caricamento eventi...</div>
              ) : eventsForSelected.length === 0 ? (
                <div className="text-sm text-muted-foreground">
                  Nessun episodio in uscita per la data selezionata
                </div>
              ) : (
                <div className="space-y-3">
                  {eventsForSelected.map((event) => (
                    <div
                      key={`${event.media_type}-${event.id}-${event.date}`}
                      className="flex items-center justify-between bg-background/60 rounded-lg px-4 py-3"
                    >
                      <div>
                        <p className="font-medium">{event.title}</p>
                        <p className="text-xs text-muted-foreground">Nuovo episodio</p>
                      </div>
                      <Button variant="outline" size="sm" asChild>
                        <Link to={`/${event.media_type}/${event.id}`}>Dettagli</Link>
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-2 mb-6">
              <Button
                variant={statusFilter === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  setStatusFilter("all");
                  setTypeFilter("all");
                }}
              >
                Tutti
              </Button>
              <Button
                variant={typeFilter === "movie" ? "default" : "outline"}
                size="sm"
                onClick={() => setTypeFilter("movie")}
              >
                Film
              </Button>
              <Button
                variant={typeFilter === "tv" ? "default" : "outline"}
                size="sm"
                onClick={() => setTypeFilter("tv")}
              >
                Serie TV
              </Button>
              {Object.entries(statusLabels).map(([key, label]) => (
                <Button
                  key={key}
                  variant={statusFilter === key ? "default" : "outline"}
                  size="sm"
                  onClick={() => setStatusFilter(key as LibraryStatus)}
                >
                  {label}
                </Button>
              ))}
            </div>

            <div className="content-grid">
              {filteredItems.map((item) => {
                const watched = getWatchedCountForItem(item);
                const total = tvTotals[item.id];
                const remaining =
                  typeof total === "number" && Number.isFinite(total)
                    ? Math.max(total - watched, 0)
                    : undefined;
                return (
                  <div key={`${item.media_type}-${item.id}`} className="relative group">
                    <MovieCard media={toMediaItem(item)} />
                    {item.media_type === "tv" && (
                      <div className="mt-2 text-xs text-muted-foreground">
                        {typeof remaining === "number"
                          ? `${watched} visti · ${remaining} mancanti`
                          : `${watched} visti`}
                      </div>
                    )}
                    <div className="mt-3 flex flex-wrap gap-2">
                      <select
                        className="bg-secondary/40 text-sm rounded-md px-2 py-1 border border-muted/30"
                        value={item.status}
                        onChange={(e) => handleStatusChange(item, e.target.value as LibraryStatus)}
                      >
                        {Object.entries(statusLabels).map(([key, label]) => (
                          <option key={key} value={key}>
                            {label}
                          </option>
                        ))}
                      </select>
                      {item.media_type === "movie" && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1"
                          onClick={() => handleMarkWatched(item)}
                        >
                          <CheckCircle2 className="h-4 w-4" />
                          Visto
                        </Button>
                      )}
                      <Button
                        variant="destructive"
                        size="sm"
                        className="gap-1"
                        onClick={() => handleRemove(item)}
                      >
                        <Trash2 className="h-4 w-4" />
                        Rimuovi
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default Library;
