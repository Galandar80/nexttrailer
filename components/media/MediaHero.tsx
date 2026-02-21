"use client";

import React from 'react';
import { useRouter } from "next/navigation";
import { ArrowLeft, X } from "lucide-react";
import { Trailer } from "@/services/tmdbApi";
import { OptimizedImage } from "@/components/OptimizedImage";

interface MediaHeroProps {
    backdropUrl: string;
    title: string;
    trailer: Trailer | null;
    showBackgroundTrailer: boolean;
    showVideo: boolean;
    setShowVideo: (show: boolean) => void;
}

export const MediaHero = ({
    backdropUrl,
    title,
    trailer,
    showBackgroundTrailer,
    showVideo,
    setShowVideo
}: MediaHeroProps) => {
    const router = useRouter();
    return (
        <div className="relative h-[50vh] lg:h-[70vh] overflow-hidden">
            <div className="absolute inset-0">
                {/* Background Image */}
                <OptimizedImage
                    src={backdropUrl}
                    alt={title}
                    className={`w-full h-full object-cover transition-opacity duration-1000 ${showBackgroundTrailer && trailer ? 'opacity-0' : 'opacity-100'}`}
                    loading="lazy"
                />

                {/* Background Trailer */}
                {showBackgroundTrailer && trailer && (
                    <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none">
                        <iframe
                            className="w-full h-full scale-150"
                            src={`https://www.youtube.com/embed/${trailer.key}?autoplay=1&mute=1&controls=0&showinfo=0&rel=0&loop=1&playlist=${trailer.key}&modestbranding=1&iv_load_policy=3&playsinline=1`}
                            title="Background Trailer"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            tabIndex={-1}
                            style={{ pointerEvents: 'none' }}
                        />
                    </div>
                )}

                <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent pointer-events-none" />
                {showBackgroundTrailer && <div className="absolute inset-0 bg-black/40 pointer-events-none transition-opacity duration-500" />}
            </div>

            <div className="absolute left-4 top-4 z-10">
                <button
                    type="button"
                    onClick={() => router.back()}
                    className="flex items-center text-sm hover:text-accent bg-black/20 backdrop-blur-sm px-3 py-2 rounded-full"
                >
                    <ArrowLeft className="h-4 w-4 mr-1" />
                    Torna Indietro
                </button>
            </div>

            {showVideo && trailer && (
                <div className="absolute inset-0 z-50 bg-black/90 flex items-center justify-center">
                    <div className="w-full max-w-4xl aspect-video">
                        <iframe
                            width="100%"
                            height="100%"
                            src={`https://www.youtube.com/embed/${trailer.key}?autoplay=1&modestbranding=1&hl=it&cc_lang_pref=it`}
                            title={trailer.name}
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            className="w-full h-full"
                        ></iframe>
                    </div>
                    <button
                        className="absolute top-4 right-4 bg-red-600 hover:bg-red-700 text-white p-2 rounded-full"
                        onClick={() => setShowVideo(false)}
                    >
                        <X className="h-6 w-6" />
                    </button>
                </div>
            )}
        </div>
    );
};
