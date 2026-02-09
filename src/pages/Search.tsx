
import React, { useState, useEffect } from "react";
import { Search as SearchIcon, Filter, X } from "lucide-react";
import { tmdbApi, MediaItem, Genre } from "@/services/tmdbApi";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ContentRow from "@/components/ContentRow";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SEO } from "@/components/SEO";
import { Badge } from "@/components/ui/badge";
import { useSearchParams } from "react-router-dom";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const Search = () => {
  const [searchParams] = useSearchParams();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<MediaItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // Filters
  const [mediaType, setMediaType] = useState<"movie" | "tv">("movie");
  const [selectedGenre, setSelectedGenre] = useState<string>("all");
  const [selectedYear, setSelectedYear] = useState<string>("all");
  const [availableGenres, setAvailableGenres] = useState<Genre[]>([]);

  // Years for filter
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 50 }, (_, i) => (currentYear - i).toString());

  useEffect(() => {
    // Load genres on mount
    const loadGenres = async () => {
      try {
        const genres = await tmdbApi.getGenres(mediaType);
        setAvailableGenres(genres);
      } catch (e) {
        console.error("Failed to load genres", e);
      }
    };
    loadGenres();
  }, [mediaType]);

  const handleSearch = React.useCallback(async (e?: React.FormEvent, overrideQuery?: string) => {
    if (e) e.preventDefault();
    const activeQuery = typeof overrideQuery === "string" ? overrideQuery : query;

    // Logic: 
    // 1. If query is present, use search API (primary)
    // 2. If query is empty but filters are set, use discover API

    if (!activeQuery.trim() && !showFilters) return;

    setIsSearching(true);
    setResults([]);

    try {
      let data: MediaItem[] = [];

      if (activeQuery.trim()) {
        // Text Search
        // Note: TMDB search/multi doesn't support easy filtering by genre/year mixed with text
        // So we just search by text. 
        // Improvement: We could client-side filter if the result set was huge, but for now simple search.
        const searchResults = await tmdbApi.search(activeQuery, 1, { includePeople: true });
        data = searchResults.results;
      } else {
        // Discover (Filter) Search
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const filters: any = {
          mediaType,
          page: 1
        };
        
        if (selectedGenre !== "all") {
          filters.genre = parseInt(selectedGenre);
        }
        
        if (selectedYear !== "all") {
          filters.year = parseInt(selectedYear);
        }

        const discoverResults = await tmdbApi.discoverMedia(filters);
        data = discoverResults;
      }

      setResults(data);
    } catch (error) {
      console.error("Errore nella ricerca:", error);
    } finally {
      setIsSearching(false);
    }
  }, [query, showFilters, mediaType, selectedGenre, selectedYear]);

  useEffect(() => {
    const urlQuery = searchParams.get("q") || "";
    if (urlQuery && urlQuery !== query) {
      setQuery(urlQuery);
      handleSearch(undefined, urlQuery);
    }
  }, [searchParams, handleSearch, query]);

  // Trigger search when filters change (if query is empty)
  useEffect(() => {
    if (!query.trim()) {
      handleSearch();
    }
  }, [mediaType, selectedGenre, selectedYear, handleSearch, query]);

  const clearFilters = () => {
    setSelectedGenre("all");
    setSelectedYear("all");
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SEO
        title="Cerca Film e Serie TV"
        description="Trova i tuoi contenuti preferiti filtrando per genere, anno e tipologia."
      />
      <Navbar />

      <main className="container mx-auto px-4 pt-24 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <h1 className="text-3xl md:text-5xl font-bold text-center mb-8">
          Cerca su <span className="text-accent">NextTrailer</span>
        </h1>

        <div className="max-w-2xl mx-auto mb-10">
          <form onSubmit={handleSearch} className="flex gap-2 relative">
            <div className="relative flex-grow">
              <Input
                type="text"
                placeholder="Titolo film, serie TV, attore..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full pl-10 h-12 text-lg bg-secondary/20 border-secondary/40 focus:border-accent"
              />
              <SearchIcon className="absolute left-3 top-3.5 h-5 w-5 text-muted-foreground" />
            </div>
            <Button type="submit" className="h-12 px-6 text-lg bg-accent hover:bg-accent/90">
              Cerca
            </Button>

            <Button
              type="button"
              variant="outline"
              className={`h-12 px-3 ${showFilters ? 'bg-secondary/40 border-accent' : ''}`}
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="h-5 w-5" />
            </Button>
          </form>

          {/* Filters Section */}
          {showFilters && (
            <div className="mt-4 p-4 bg-secondary/10 rounded-lg border border-white/5 animate-in slide-in-from-top-2">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">Filtri Avanzati</h3>
                {(selectedGenre !== "all" || selectedYear !== "all") && (
                  <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8 text-xs text-red-400 hover:text-red-300">
                    <X className="h-3 w-3 mr-1" /> Azzera
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Media Type */}
                <div className="space-y-2">
                  <label className="text-xs font-medium">Tipo</label>
                  <div className="flex bg-secondary/30 p-1 rounded-md">
                    <button
                      onClick={() => setMediaType("movie")}
                      className={`flex-1 py-1.5 text-sm rounded-sm transition-all ${mediaType === "movie" ? "bg-accent text-white shadow" : "text-muted-foreground hover:text-white"}`}
                    >
                      Film
                    </button>
                    <button
                      onClick={() => setMediaType("tv")}
                      className={`flex-1 py-1.5 text-sm rounded-sm transition-all ${mediaType === "tv" ? "bg-accent text-white shadow" : "text-muted-foreground hover:text-white"}`}
                    >
                      Serie TV
                    </button>
                  </div>
                </div>

                {/* Genre */}
                <div className="space-y-2">
                  <label className="text-xs font-medium">Genere</label>
                  <Select value={selectedGenre} onValueChange={setSelectedGenre}>
                    <SelectTrigger className="bg-secondary/20 border-secondary/40">
                      <SelectValue placeholder="Tutti i generi" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tutti i generi</SelectItem>
                      {availableGenres.map(g => (
                        <SelectItem key={g.id} value={g.id.toString()}>{g.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Year */}
                <div className="space-y-2">
                  <label className="text-xs font-medium">Anno</label>
                  <Select value={selectedYear} onValueChange={setSelectedYear}>
                    <SelectTrigger className="bg-secondary/20 border-secondary/40">
                      <SelectValue placeholder="Tutti gli anni" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[200px]">
                      <SelectItem value="all">Tutti gli anni</SelectItem>
                      {years.map(year => (
                        <SelectItem key={year} value={year}>{year}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}
        </div>

        {isSearching ? (
          <div className="flex justify-center p-20">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-accent"></div>
          </div>
        ) : (
          <>
            {(results.length > 0) ? (
              <div className="space-y-8">
                <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
                  <SearchIcon className="h-5 w-5 text-accent" />
                  Risultati trovati
                  <Badge variant="secondary" className="ml-2">{results.length}</Badge>
                </h2>
                <ContentRow title="" items={results} />
              </div>
            ) : (query.trim() || selectedGenre !== "all" || selectedYear !== "all") ? (
              <div className="text-center py-20 bg-secondary/5 rounded-xl border border-white/5">
                <p className="text-muted-foreground text-lg">Nessun risultato trovato.</p>
                <p className="text-sm text-muted-foreground mt-2">Prova a modificare i filtri o la ricerca.</p>
              </div>
            ) : (
              <div className="text-center py-20 opacity-50">
                <p>Inizia a cercare o usa i filtri per scoprire nuovi titoli</p>
              </div>
            )}
          </>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default Search;
