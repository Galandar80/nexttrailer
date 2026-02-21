"use client";

import { useState, useEffect } from "react";
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { tmdbApi, MediaItem } from "@/services/tmdbApi";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import MovieCard from "@/components/MovieCard";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useApiKeyStore } from "@/store/useApiKeyStore";

const GenreBrowse = () => {
  const params = useParams();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const searchParamsString = searchParams.toString();
  const mediaType = Array.isArray(params.mediaType) ? params.mediaType[0] : params.mediaType;
  const genreId = Array.isArray(params.genreId) ? params.genreId[0] : params.genreId;
  const genreName = searchParams.get("name") || "Genre";
  const isAllGenres = genreId === "all";

  const [content, setContent] = useState<MediaItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const { toast } = useToast();
  const { apiKey } = useApiKeyStore();

  // Filters state
  const [showFilters, setShowFilters] = useState(true);
  const [filters, setFilters] = useState({
    sortBy: searchParams.get("sort") || "popularity.desc",
    year: searchParams.get("year") || ""
  });

  useEffect(() => {
    const loadContent = async () => {
      if (!mediaType || !genreId) return;

      setIsLoading(true);
      setContent([]); // Clear existing content
      setCurrentPage(1); // Reset page number

      try {
        console.log(`Loading content for genre: ${genreId}, mediaType: ${mediaType}, filters:`, filters);
        const items = isAllGenres
          ? await tmdbApi.discoverMedia({
              mediaType: mediaType as "movie" | "tv",
              page: 1,
              sortBy: filters.sortBy,
              year: filters.year ? Number(filters.year) : undefined
            })
          : await tmdbApi.getContentByGenre(
              mediaType as "movie" | "tv",
              parseInt(genreId),
              1,
              {
                sortBy: filters.sortBy,
                year: filters.year
              }
            );

        if (items.length === 0) {
          toast({
            title: "Nessun risultato",
            description: isAllGenres ? "Nessun contenuto trovato." : `Nessun contenuto trovato per questo genere: ${genreName}`,
            variant: "default",
          });
        } else {
          setContent(items);
        }
      } catch (error) {
        console.error("Error loading genre content:", error);
        toast({
          title: "Errore",
          description: apiKey ? "Impossibile caricare i contenuti per questo genere" : "API key necessaria per caricare i contenuti",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadContent();
  }, [mediaType, genreId, filters, toast, apiKey, genreName, isAllGenres]);

  const handleApplyFilters = (newFilters: typeof filters) => {
    setFilters(newFilters);

    // Update URL params
    const params = new URLSearchParams(searchParamsString);
    if (newFilters.sortBy) params.set("sort", newFilters.sortBy);
    else params.delete("sort");

    if (newFilters.year) params.set("year", newFilters.year);
    else params.delete("year");

    const nextParams = params.toString();
    router.replace(nextParams ? `${pathname}?${nextParams}` : pathname);
    setShowFilters(false);
  };

  const loadMore = async () => {
    if (!mediaType || !genreId) return;

    const nextPage = currentPage + 1;

    try {
      const additionalContent = isAllGenres
        ? await tmdbApi.discoverMedia({
            mediaType: mediaType as "movie" | "tv",
            page: nextPage,
            sortBy: filters.sortBy,
            year: filters.year ? Number(filters.year) : undefined
          })
        : await tmdbApi.getContentByGenre(
            mediaType as "movie" | "tv",
            parseInt(genreId),
            nextPage,
            {
              sortBy: filters.sortBy,
              year: filters.year
            }
          );

      if (additionalContent.length > 0) {
        setContent(prev => [...prev, ...additionalContent]);
        setCurrentPage(nextPage);
      } else {
        toast({
          title: "Fine dei risultati",
          description: "Non ci sono più contenuti da caricare",
          variant: "default",
        });
      }
    } catch (error) {
      console.error("Error loading more content:", error);
      toast({
        title: "Errore",
        description: "Impossibile caricare altri contenuti",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />

      <main className="max-w-screen-xl mx-auto px-4 md:px-8 py-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div className="flex items-center">
            <Button
              variant="ghost"
              className="mr-4"
              onClick={() => router.back()}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>

            <div>
              <p className="text-sm text-muted-foreground">
                {mediaType === "movie" ? "Film" : "Serie TV"}
              </p>
              <h1 className="text-3xl font-semibold">
                {genreName}
              </h1>
            </div>
          </div>

          <Button onClick={() => setShowFilters(!showFilters)} variant="outline">
            {showFilters ? "Chiudi Filtri" : "Filtri"}
          </Button>
        </div>

        {showFilters && (
          <div className="bg-secondary/20 p-4 rounded-lg mb-8 grid grid-cols-1 md:grid-cols-3 gap-4 animate-in fade-in slide-in-from-top-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Ordinamento</label>
              <select
                className="w-full p-2 rounded-md bg-background border border-input"
                value={filters.sortBy}
                onChange={(e) => handleApplyFilters({ ...filters, sortBy: e.target.value })}
              >
                <option value="popularity.desc">Popolarità (Decrescente)</option>
                <option value="popularity.asc">Popolarità (Crescente)</option>
                <option value="vote_average.desc">Voto (Alto-Basso)</option>
                <option value="vote_average.asc">Voto (Basso-Alto)</option>
                <option value="primary_release_date.desc">Data Uscita (Nuovi-Vecchi)</option>
                <option value="primary_release_date.asc">Data Uscita (Vecchi-Nuovi)</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Anno di Uscita</label>
              <select
                className="w-full p-2 rounded-md bg-background border border-input"
                value={filters.year}
                onChange={(e) => handleApplyFilters({ ...filters, year: e.target.value })}
              >
                <option value="">Tutti gli anni</option>
                {Array.from({ length: new Date().getFullYear() - 1950 + 1 }, (_, i) => new Date().getFullYear() - i).map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <Button
                variant="secondary"
                className="w-full"
                onClick={() => handleApplyFilters({ sortBy: "popularity.desc", year: "" })}
              >
                Resetta Filtri
              </Button>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {[...Array(10)].map((_, idx) => (
              <div
                key={idx}
                className="aspect-[2/3] bg-secondary/20 animate-pulse rounded-md"
              />
            ))}
          </div>
        ) : (
          <>
            {content.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">
                  {apiKey
                    ? isAllGenres
                      ? "Nessun contenuto trovato con i filtri selezionati."
                      : "Nessun contenuto trovato per questo genere con i filtri selezionati."
                    : "API key necessaria per visualizzare i contenuti."}
                </p>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => router.back()}
                >
                  Torna indietro
                </Button>
              </div>
            ) : (
              <div className="content-grid grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {content.map((item) => (
                  <MovieCard
                    key={`${item.id}-${item.media_type}`}
                    media={item}
                  />
                ))}
              </div>
            )}

            {content.length > 0 && (
              <div className="mt-8 text-center">
                <Button variant="outline" onClick={loadMore}>
                  Carica Altri
                </Button>
              </div>
            )}
          </>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default GenreBrowse;
