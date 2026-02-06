
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Star, Clock, Play } from "lucide-react";
import { MediaItem, tmdbApi } from "@/services/tmdbApi";
import { OptimizedImage } from "@/components/OptimizedImage";

interface MovieCardProps {
  media: MediaItem;
  showBadge?: boolean;
  similarTitle?: string;
}

export const MovieCard = ({ media, showBadge = false, similarTitle }: MovieCardProps) => {
  const [isHovered, setIsHovered] = useState(false);
  const navigate = useNavigate();

  const mediaType = media.media_type === "person" ? "person" : (media.media_type || ("title" in media ? "movie" : "tv"));
  const isMovie = mediaType === "movie";
  const title = isMovie ? media.title : media.name;
  const date = isMovie ? media.release_date : media.first_air_date;
  const poster = tmdbApi.getImageUrl(media.poster_path, "w342");
  const year = date ? new Date(date).getFullYear() : "";

  // Dynamic badges
  const isTrending = media.popularity > 200;
  const isNewRelease = date && (new Date().getTime() - new Date(date).getTime()) < 1000 * 60 * 60 * 24 * 14; // 14 days

  const getBadgeText = () => {
    if (isNewRelease) return "New Release";
    if (isTrending) return "Trending";
    return null;
  };

  const handleClick = () => {
    if (mediaType === "person") {
      navigate(`/person/${media.id}`);
      return;
    }
    navigate(`/${mediaType}/${media.id}`);
  };

  const badgeText = getBadgeText();

  // Rating to stars (out of 5)
  const stars = Math.round((media.vote_average / 2) * 10) / 10;

  return (
    <div
      className="movie-poster transition-all duration-300 hover:scale-105 hover:z-10"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleClick}
    >
      <OptimizedImage
        src={poster}
        alt={title}
        className="w-full h-full object-cover"
        loading="lazy"
      />

      {showBadge && badgeText && (
        <div className="movie-badge animate-trailer-pulse">
          {badgeText}
        </div>
      )}

      <div className="hover-card">
        <div className="mb-1 flex justify-between items-end">
          <h3 className="text-base font-semibold line-clamp-2">{title}</h3>
          <span className="text-xs opacity-70">{year}</span>
        </div>

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

        {similarTitle && (
          <div className="mt-auto text-xs text-muted-foreground">
            <p>Recommended if you like:</p>
            <p className="font-medium text-accent">{similarTitle}</p>
          </div>
        )}

        <button className="mt-2 bg-accent/90 hover:bg-accent text-white py-1 px-3 rounded-full text-xs font-medium flex items-center justify-center w-full">
          <Play className="h-3 w-3 mr-1" />
          Preview
        </button>
      </div>
    </div>
  );
};

export default MovieCard;
