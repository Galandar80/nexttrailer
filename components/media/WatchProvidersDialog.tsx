
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { tmdbApi, MediaDetails } from "@/services/tmdbApi";
import { OptimizedImage } from "@/components/OptimizedImage";

interface WatchProvidersDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    media: MediaDetails;
}

export const WatchProvidersDialog = ({
    open,
    onOpenChange,
    title,
    media
}: WatchProvidersDialogProps) => {
    const providers = media.watch_providers?.results?.IT;
    const hasWatchProviders =
        Boolean(providers) &&
        ((providers?.flatrate?.length ?? 0) > 0 ||
            (providers?.rent?.length ?? 0) > 0 ||
            (providers?.buy?.length ?? 0) > 0);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Dove guardare {title}</DialogTitle>
                </DialogHeader>

                {hasWatchProviders ? (
                    <div className="space-y-4 max-h-[60vh] overflow-y-auto py-4">
                        {providers?.flatrate && (
                            <div>
                                <h3 className="font-medium mb-2 text-accent">Streaming</h3>
                                <div className="flex flex-wrap gap-4">
                                    {providers.flatrate.map(provider => (
                                        <div
                                            key={provider.provider_id}
                                            className="flex flex-col items-center gap-1"
                                        >
                                            <OptimizedImage
                                                src={tmdbApi.getImageUrl(provider.logo_path, "w185")}
                                                alt={provider.provider_name}
                                                className="w-16 h-16 rounded-lg shadow-md"
                                                loading="lazy"
                                            />
                                            <span className="text-xs text-center text-muted-foreground">{provider.provider_name}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {providers?.rent && (
                            <div>
                                <h3 className="font-medium mb-2 text-accent">Noleggio</h3>
                                <div className="flex flex-wrap gap-4">
                                    {providers.rent.map(provider => (
                                        <div
                                            key={provider.provider_id}
                                            className="flex flex-col items-center gap-1"
                                        >
                                            <OptimizedImage
                                                src={tmdbApi.getImageUrl(provider.logo_path, "w185")}
                                                alt={provider.provider_name}
                                                className="w-16 h-16 rounded-lg shadow-md"
                                                loading="lazy"
                                            />
                                            <span className="text-xs text-center text-muted-foreground">{provider.provider_name}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {providers?.buy && (
                            <div>
                                <h3 className="font-medium mb-2 text-accent">Acquisto</h3>
                                <div className="flex flex-wrap gap-4">
                                    {providers.buy.map(provider => (
                                        <div
                                            key={provider.provider_id}
                                            className="flex flex-col items-center gap-1"
                                        >
                                            <OptimizedImage
                                                src={tmdbApi.getImageUrl(provider.logo_path, "w185")}
                                                alt={provider.provider_name}
                                                className="w-16 h-16 rounded-lg shadow-md"
                                                loading="lazy"
                                            />
                                            <span className="text-xs text-center text-muted-foreground">{provider.provider_name}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="py-4 text-center text-muted-foreground">
                        <p>Non sono disponibili informazioni su dove guardare questo titolo.</p>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
};
