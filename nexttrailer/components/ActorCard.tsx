
import React from 'react';
import { tmdbApi } from "@/services/tmdbApi";
import { OptimizedImage } from "@/components/OptimizedImage";

interface ActorProps {
  actor: {
    id: number;
    name: string;
    character: string;
    profile_path: string | null;
  };
}

const ActorCard = ({ actor }: ActorProps) => {
  const profileUrl = actor.profile_path 
    ? tmdbApi.getImageUrl(actor.profile_path, "w185")
    : '/placeholder.svg';
  
  return (
    <div className="actor-card bg-secondary/10 rounded-lg overflow-hidden hover:bg-secondary/20 transition-colors">
      <div className="h-40 overflow-hidden">
        <OptimizedImage
          src={profileUrl}
          alt={actor.name}
          className="w-full h-full object-cover"
          loading="lazy"
        />
      </div>
      <div className="p-2">
        <h3 className="font-medium text-sm line-clamp-1">{actor.name}</h3>
        <p className="text-xs text-muted-foreground line-clamp-1">{actor.character}</p>
      </div>
    </div>
  );
};

export default ActorCard;
