
import React from 'react';
import { Play, Film, Star, Tv, Bookmark, Share2, Image, FileText, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MediaActionsProps {
    onWatchNow: () => void;
    onPlayTrailer: () => void;
    onShowReviews: () => void;
    onShowComments: () => void;
    onShowSeasons: () => void;
    onAddToWatchlist: () => void;
    onToggleLibrary: () => void;
    onMarkWatched: () => void;
    onShare: () => void;
    onShowGallery: () => void;
    onShowTrivia: () => void;
    mediaType: "movie" | "tv";
    isInWatchlist: boolean;
    isInLibrary: boolean;
    isLoggedIn: boolean;
}

export const MediaActions = ({
    onWatchNow,
    onPlayTrailer,
    onShowReviews,
    onShowComments,
    onShowSeasons,
    onAddToWatchlist,
    onToggleLibrary,
    onMarkWatched,
    onShare,
    onShowGallery,
    onShowTrivia,
    mediaType,
    isInWatchlist,
    isInLibrary,
    isLoggedIn
}: MediaActionsProps) => {
    return (
        <div className="flex flex-wrap gap-3 mb-8">
            <Button
                className="gap-2"
                style={{ backgroundColor: '#0066cc', borderColor: '#0066cc' }}
                onClick={onWatchNow}
            >
                <Play className="h-4 w-4" />
                Guarda Ora
            </Button>

            <Button
                className="gap-2"
                style={{ backgroundColor: '#ea384c', borderColor: '#ea384c' }}
                onClick={onPlayTrailer}
            >
                <Film className="h-4 w-4" />
                Trailer
            </Button>

            <Button
                className="gap-2"
                onClick={onShowReviews}
            >
                <Star className="h-4 w-4" />
                Recensioni
            </Button>
            <Button
                className="gap-2"
                onClick={onShowComments}
            >
                <MessageCircle className="h-4 w-4" />
                Commenti
            </Button>

            {mediaType === "tv" && (
                <Button
                    className="gap-2"
                    onClick={onShowSeasons}
                >
                    <Tv className="h-4 w-4" />
                    Stagioni
                </Button>
            )}

            {isLoggedIn && (
                <>
                    <Button variant="outline" className="gap-2" onClick={onAddToWatchlist}>
                        <Bookmark className={`h-4 w-4 ${isInWatchlist ? 'fill-current' : ''}`} />
                        {isInWatchlist ? 'Rimuovi da Watchlist' : 'Aggiungi a Watchlist'}
                    </Button>

                    <Button variant="outline" className="gap-2" onClick={onToggleLibrary}>
                        {mediaType === "tv" ? (
                            <Tv className={`h-4 w-4 ${isInLibrary ? 'fill-current' : ''}`} />
                        ) : (
                            <Film className={`h-4 w-4 ${isInLibrary ? 'fill-current' : ''}`} />
                        )}
                        {isInLibrary ? "Rimuovi dallo Storico" : mediaType === "tv" ? "Segui Serie" : "Aggiungi allo Storico"}
                    </Button>

                    {mediaType === "movie" && (
                        <Button variant="outline" className="gap-2" onClick={onMarkWatched}>
                            <Star className="h-4 w-4" />
                            Segna visto
                        </Button>
                    )}
                </>
            )}

            <Button variant="outline" className="gap-2" onClick={onShare}>
                <Share2 className="h-4 w-4" />
                Condividi
            </Button>

            <Button variant="outline" className="gap-2" onClick={onShowGallery}>
                <Image className="h-4 w-4" />
                Galleria
            </Button>

            <Button variant="outline" className="gap-2" onClick={onShowTrivia}>
                <FileText className="h-4 w-4" />
                Curiosità
            </Button>
        </div>
    );
};
