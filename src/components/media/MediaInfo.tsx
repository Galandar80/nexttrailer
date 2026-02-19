
import React from 'react';
import { Star, Clock, Calendar, Globe, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { MediaDetails } from "@/services/tmdbApi";

interface MediaInfoProps {
    media: MediaDetails;
    title: string;
    releaseYear: string;
    releaseDate: string | undefined;
    runtimeString: string;
    nextTrailerAverage: string;
    nextTrailerCount: number;
}

export const MediaInfo = ({
    media,
    title,
    releaseYear,
    releaseDate,
    runtimeString,
    nextTrailerAverage,
    nextTrailerCount
}: MediaInfoProps) => {
    return (
        <div className="mb-6">
            <div className="flex items-center space-x-2 text-sm text-muted-foreground mb-2">
                {media.genres && media.genres.slice(0, 3).map(genre => (
                    <Badge key={genre.id} variant="secondary" className="bg-secondary/30">
                        {genre.name}
                    </Badge>
                ))}
            </div>

            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-2">
                {title} {releaseYear && <span className="font-normal text-muted-foreground">({releaseYear})</span>}
            </h1>

            <div className="flex items-center flex-wrap gap-x-4 gap-y-2 my-4 text-sm text-muted-foreground">
                {media.vote_average > 0 && (
                    <div className="flex items-center">
                        <Star className="h-5 w-5 text-yellow-500 fill-yellow-500 mr-1" />
                        <span className="font-medium text-white">{(media.vote_average / 2).toFixed(1)}</span>
                        <span className="text-xs ml-1">/5</span>
                    </div>
                )}
                {nextTrailerAverage !== "—" && (
                    <div className="flex items-center">
                        <Sparkles className="h-5 w-5 text-accent mr-1" />
                        <span className="font-medium text-white">{nextTrailerAverage}</span>
                        <span className="text-xs ml-1">/10</span>
                        {nextTrailerCount > 0 && (
                            <span className="text-xs ml-2 text-muted-foreground">NextTrailer</span>
                        )}
                    </div>
                )}

                <div className="flex items-center">
                    <Clock className="h-4 w-4 mr-1" />
                    {runtimeString}
                </div>

                {releaseDate && (
                    <div className="flex items-center">
                        <Calendar className="h-4 w-4 mr-1" />
                        {new Date(releaseDate).toLocaleDateString("it-IT", {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                        })}
                    </div>
                )}

                {media.production_countries?.length > 0 && (
                    <div className="flex items-center">
                        <Globe className="h-4 w-4 mr-1" />
                        {media.production_countries.map(c => c.name).join(", ")}
                    </div>
                )}
            </div>
        </div>
    );
};
