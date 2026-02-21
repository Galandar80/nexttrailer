"use client";

import React, { useState, useEffect } from "react";
import { Film, Tv } from "lucide-react";
import { Genre, tmdbApi } from "@/services/tmdbApi";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";

const genreIconMap: Record<number, string> = {
  28: "💥", // Action
  12: "🌍", // Adventure
  16: "🎨", // Animation
  35: "😂", // Comedy
  80: "🔍", // Crime
  99: "📚", // Documentary
  18: "🎭", // Drama
  10751: "👨‍👩‍👧‍👦", // Family
  14: "✨", // Fantasy
  36: "📜", // History
  27: "😱", // Horror
  10402: "🎵", // Music
  9648: "🔎", // Mystery
  10749: "❤️", // Romance
  878: "🛸", // Science Fiction
  10770: "📺", // TV Movie
  53: "😰", // Thriller
  10752: "⚔️", // War
  37: "🤠", // Western
  10759: "🎬", // Action & Adventure (TV)
  10762: "👶", // Kids (TV)
  10763: "📰", // News (TV)
  10764: "📝", // Reality (TV)
  10765: "🧙‍♂️", // Sci-Fi & Fantasy (TV)
  10766: "🧼", // Soap (TV)
  10767: "💭", // Talk (TV)
  10768: "⚔️", // War & Politics (TV)
};

interface GenresSectionProps {
  onGenreSelect?: (genre: Genre, mediaType: "movie" | "tv") => void;
  defaultMediaType?: "movie" | "tv";
}

const GenresSection = ({ onGenreSelect, defaultMediaType }: GenresSectionProps) => {
  const [movieGenres, setMovieGenres] = useState<Genre[]>([]);
  const [tvGenres, setTvGenres] = useState<Genre[]>([]);
  const [activeTab, setActiveTab] = useState<"movie" | "tv">(defaultMediaType || "movie");
  const [loading, setLoading] = useState<boolean>(true);
  const { toast } = useToast();
  const router = useRouter();
  
  useEffect(() => {
    const loadGenres = async () => {
      setLoading(true);
      try {
        const [movieData, tvData] = await Promise.all([
          tmdbApi.getGenres("movie"),
          tmdbApi.getGenres("tv")
        ]);
        
        setMovieGenres(movieData || []);
        setTvGenres(tvData || []);
      } catch (error) {
        console.error("Error loading genres:", error);
        toast({
          title: "Errore",
          description: "Impossibile caricare i generi. Verranno mostrati generi di esempio.",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };
    
    loadGenres();
  }, [toast]);

  useEffect(() => {
    if (defaultMediaType) {
      setActiveTab(defaultMediaType);
    }
  }, [defaultMediaType]);
  
  const genres = activeTab === "movie" ? movieGenres : tvGenres;

  const handleGenreClick = (genre: Genre, mediaType: "movie" | "tv") => {
    if (onGenreSelect) {
      onGenreSelect(genre, mediaType);
    } else {
      // Direct navigation if no onGenreSelect handler is provided
      router.push(`/${mediaType}/genre/${genre.id}?name=${encodeURIComponent(genre.name)}`);
    }
  };
  
  return (
    <div className="content-section">
      <div className="flex items-center justify-between mb-6">
        <h2 className="section-title">Sfoglia per Genere</h2>
        
        <div className="flex bg-secondary/30 rounded-full p-1">
          <button
            className={`flex items-center px-4 py-2 rounded-full text-sm font-medium ${
              activeTab === "movie" 
                ? "bg-accent text-white" 
                : "hover:bg-secondary/70"
            }`}
            onClick={() => setActiveTab("movie")}
          >
            <Film className="h-4 w-4 mr-2" />
            Film
          </button>
          <button
            className={`flex items-center px-4 py-2 rounded-full text-sm font-medium ${
              activeTab === "tv" 
                ? "bg-accent text-white" 
                : "hover:bg-secondary/70"
            }`}
            onClick={() => setActiveTab("tv")}
          >
            <Tv className="h-4 w-4 mr-2" />
            Serie TV
          </button>
        </div>
      </div>
      
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(i => (
            <div 
              key={i}
              className="h-24 bg-secondary/20 animate-pulse rounded-lg"
            />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {genres.map(genre => (
            <button
              key={genre.id}
              onClick={() => handleGenreClick(genre, activeTab)}
              className="group relative overflow-hidden rounded-lg h-24 flex items-center justify-center text-center transition-all shadow-md hover:shadow-xl"
              style={{
                background: `linear-gradient(rgba(0,0,0,0.4), rgba(0,0,0,0.7))`
              }}
            >
              <div className="absolute inset-0 bg-cover bg-center opacity-50 group-hover:opacity-70 transition-opacity"
                style={{ 
                  backgroundImage: `url(/genre-bg-${genre.id % 12}.jpg)`,
                  backgroundSize: 'cover',
                  filter: 'brightness(0.6)'
                }} 
              />
              <div className="relative z-10 flex flex-col items-center justify-center p-3">
                <span className="text-2xl mb-1">
                  {genreIconMap[genre.id] || "🎬"}
                </span>
                <span className="font-medium text-white group-hover:text-accent transition-colors">
                  {genre.name}
                </span>
              </div>
              <div className="absolute inset-0 border-2 border-transparent group-hover:border-accent rounded-lg transition-colors" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default GenresSection;
