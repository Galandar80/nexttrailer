"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Star, Clock, Play, Volume2, VolumeX } from "lucide-react";
import { MediaItem, tmdbApi } from "@/services/tmdbApi";
import { OptimizedImage } from "@/components/OptimizedImage";

interface MovieCardProps {
  media: MediaItem;
  showBadge?: boolean;
  similarTitle?: string;
}

export const MovieCard = ({ media, showBadge = false, similarTitle }: MovieCardProps) => {
  const [trailerKey, setTrailerKey] = useState<string | null>(null);
  const [isTrailerVisible, setIsTrailerVisible] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isActiveRef = useRef(false);
  const router = useRouter();

  const mediaType = media.media_type === "person" ? "person" : (media.media_type || ("title" in media ? "movie" : "tv"));
  const isMovie = mediaType === "movie";
  const isTv = mediaType === "tv";
  const isPerson = mediaType === "person";
  const title = (isMovie ? media.title : media.name) || "";
  const date = isMovie ? media.release_date : media.first_air_date;
  const imagePath = isPerson ? (media.profile_path || media.poster_path) : media.poster_path;
  const poster = tmdbApi.getImageUrl(imagePath, "w342");
  const year = date ? new Date(date).getFullYear() : "";

  // Dynamic badges
  const isTrending = media.popularity > 200;
  const isNewRelease = date && (new Date().getTime() - new Date(date).getTime()) < 1000 * 60 * 60 * 24 * 14; // 14 days

  const getBadgeText = () => {
    if (isNewRelease) return "New Release";
    if (isTrending) return "Trending";
    return null;
  };

  const handleClick = (event: React.MouseEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    if (target.closest("[data-audio-toggle]")) {
      return;
    }
    if (mediaType === "person") {
      router.push(`/person/${media.id}`);
      return;
    }
    router.push(`/${mediaType}/${media.id}`);
  };

  const badgeText = getBadgeText();

  // Rating to stars (out of 5)
  const stars = Math.round(((media.vote_average || 0) / 2) * 10) / 10;

  const handleMouseEnter = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    if (isPerson || (!isMovie && !isTv)) {
      setIsTrailerVisible(false);
      return;
    }
    setIsTrailerVisible(false);
    isActiveRef.current = true;
    const previewType = isMovie ? "movie" : "tv";
    hoverTimeoutRef.current = setTimeout(() => {
      const loadTrailer = async () => {
        try {
          let key = trailerKey;
          if (!key) {
            const videos = await tmdbApi.getTrailers(media.id, previewType);
            if (!isActiveRef.current) return;
            const first = videos[0];
            if (first?.key) {
              key = first.key;
              setTrailerKey(first.key);
            }
          }
          if (!isActiveRef.current) return;
          setIsTrailerVisible(Boolean(key));
        } catch {
          if (isActiveRef.current) setIsTrailerVisible(false);
        }
      };
      void loadTrailer();
    }, 1500);
  };

  const handleMouseLeave = () => {
    isActiveRef.current = false;
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    setIsTrailerVisible(false);
  };

  return (
    <div
      className="movie-poster transition-all duration-300 hover:scale-105 hover:z-10"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
    >
      <OptimizedImage
        src={poster}
        alt={title}
        className={`w-full h-full object-cover transition-opacity duration-300 ${isTrailerVisible ? "opacity-0" : "opacity-100"}`}
        loading="lazy"
      />

      {isTrailerVisible && trailerKey && (
        <div className="absolute inset-0 z-10">
          <iframe
            title={`${title} trailer`}
            className="w-full h-full pointer-events-none"
            src={`https://www.youtube.com/embed/${trailerKey}?autoplay=1&mute=${isMuted ? 1 : 0}&controls=0&rel=0&showinfo=0&playsinline=1&modestbranding=1`}
            key={`${trailerKey}-${isMuted ? "muted" : "sound"}`}
            allow="autoplay; encrypted-media; picture-in-picture"
            allowFullScreen
          />
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              setIsMuted((value) => !value);
            }}
            onPointerDown={(event) => event.stopPropagation()}
            onMouseDown={(event) => event.stopPropagation()}
            data-audio-toggle
            className="absolute top-2 left-2 z-20 bg-black/60 text-white rounded-full h-8 w-8 flex items-center justify-center hover:bg-black/80"
          >
            {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </button>
        </div>
      )}

      {showBadge && badgeText && (
        <div className="movie-badge animate-trailer-pulse">
          {badgeText}
        </div>
      )}

      <div className={`hover-card z-20 ${isTrailerVisible ? "from-black/80 via-black/40" : ""}`}>
        <div className="mb-1 flex justify-between items-end">
          <h3 className="text-base font-semibold line-clamp-2">{title}</h3>
          <span className="text-xs opacity-70">{year}</span>
        </div>

        {!isPerson && (
          <div className="flex items-center space-x-2 mb-2">
            <div className="flex items-center text-amber-400">
              <Star className="h-3 w-3 fill-amber-400 stroke-0 mr-1" />
              <span className="text-xs">{stars.toFixed(1)}</span>
            </div>
            {isMovie && media.runtime && (
              <div className="flex items-center text-muted-foreground">
                <Clock className="h-3 w-3 mr-1" />
                <span className="text-xs">{media.runtime} min</span>
              </div>
            )}
          </div>
        )}

        {similarTitle && (
          <div className="mt-auto text-xs text-muted-foreground">
            <p>Recommended if you like:</p>
            <p className="font-medium text-accent">{similarTitle}</p>
          </div>
        )}

        {!isPerson && (
          <button className="mt-2 bg-accent/90 hover:bg-accent text-white py-1 px-3 rounded-full text-xs font-medium flex items-center justify-center w-full">
            <Play className="h-3 w-3 mr-1" />
            Preview
          </button>
        )}
      </div>
    </div>
  );
};

export default MovieCard;
