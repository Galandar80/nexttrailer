"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Film, Star } from "lucide-react";
import { tmdbApi } from "@/services/tmdbApi";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { SEO } from "@/components/SEO";
import { PersonDetails, PersonCredit } from "@/services/api/personApi";
import { OptimizedImage } from "@/components/OptimizedImage";

const PersonDetailsPage = () => {
    const params = useParams();
    const router = useRouter();
    const id = Array.isArray(params.id) ? params.id[0] : params.id;
    const [actor, setActor] = useState<PersonDetails | null>(null);
    const [credits, setCredits] = useState<PersonCredit[]>([]);
    const [translatedBio, setTranslatedBio] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isTranslating, setIsTranslating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [filter, setFilter] = useState<'all' | 'movie' | 'tv'>('all');

    useEffect(() => {
        const fetchActorDetails = async () => {
            if (!id) return;

            setIsLoading(true);
            setError(null);
            try {
                const actorId = parseInt(id);
                const actorData = await tmdbApi.getPersonDetails(actorId);
                setActor(actorData);

                // Biography translation logic (simplified reuse)
                if (!actorData.biography || actorData.biography.trim() === "") {
                    try {
                        const enActorData = await tmdbApi.getPersonDetails(actorId, 'en-US');
                        if (enActorData.biography && enActorData.biography.trim() !== "") {
                            translateBiography(enActorData.biography);
                        }
                    } catch (e) {
                        console.log("Failed to fetch English bio", e);
                    }
                }

                const creditsData = await tmdbApi.getPersonCredits(actorId);
                const castList = creditsData.cast || [];

                // Remove duplicates and items without poster
                const seen = new Set();
                const uniqueCredits = castList.filter(credit => {
                    const key = `${credit.media_type}-${credit.id}`;
                    const duplicate = seen.has(key);
                    seen.add(key);
                    return !duplicate && credit.poster_path;
                });

                const sortedCredits = uniqueCredits.sort((a, b) => {
                    const dateA = a.release_date || a.first_air_date || "";
                    const dateB = b.release_date || b.first_air_date || "";
                    return dateB.localeCompare(dateA);
                });

                setCredits(sortedCredits);
            } catch (err) {
                console.error("Error fetching person details:", err);
                setError("Impossibile caricare i dettagli. Riprova più tardi.");
            } finally {
                setIsLoading(false);
            }
        };

        fetchActorDetails();
    }, [id]);

    const translateBiography = async (biography: string) => {
        if (!biography || biography.length < 10) return;
        setIsTranslating(true);
        try {
            const maxChunkSize = 500;
            const chunks = [];
            for (let i = 0; i < biography.length; i += maxChunkSize) {
                chunks.push(biography.substring(i, i + maxChunkSize));
            }

            const translatedChunks = await Promise.all(
                chunks.map(async (chunk) => {
                    try {
                        const res = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(chunk)}&langpair=en|it`);
                        const data = await res.json();
                        return data.responseStatus === 200 ? data.responseData.translatedText : chunk;
                    } catch { return chunk; }
                })
            );
            setTranslatedBio(translatedChunks.join(" "));
        } catch (e) { console.error(e); }
        finally { setIsTranslating(false); }
    };

    const getGender = (genderCode: number) => {
        if (genderCode === 1) return "Donna";
        if (genderCode === 2) return "Uomo";
        return "Non specificato";
    };

    const formatDate = (dateString: string | null) => {
        if (!dateString) return "Sconosciuta";
        return new Date(dateString).toLocaleDateString("it-IT", { year: 'numeric', month: 'long', day: 'numeric' });
    };

    const calculateAge = (birthday: string | null, deathday: string | null) => {
        if (!birthday) return null;
        const birthDate = new Date(birthday);
        const endDate = deathday ? new Date(deathday) : new Date();
        let age = endDate.getFullYear() - birthDate.getFullYear();
        const m = endDate.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && endDate.getDate() < birthDate.getDate())) age--;
        return age;
    };

    const filteredCredits = credits.filter(c => filter === 'all' || c.media_type === filter);
    const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL || "").replace(/\/$/, "");
    const seoUrl = useMemo(() => {
        if (typeof window !== "undefined") return window.location.href;
        if (baseUrl && id) return `${baseUrl}/person/${id}`;
        return baseUrl || "";
    }, [baseUrl, id]);
    const seoJsonLd = useMemo(() => {
        if (!actor) return null;
        const image = actor.profile_path ? tmdbApi.getImageUrl(actor.profile_path, "w500") : undefined;
        const description = translatedBio || actor.biography || undefined;
        return {
            "@context": "https://schema.org",
            "@type": "Person",
            name: actor.name,
            image,
            description,
            birthDate: actor.birthday || undefined,
            deathDate: actor.deathday || undefined,
            jobTitle: actor.known_for_department || undefined,
            url: seoUrl || undefined
        };
    }, [actor, seoUrl, translatedBio]);

    if (isLoading) {
        return (
            <div className="min-h-screen bg-background text-foreground">
                <Navbar />
                <div className="h-[60vh] flex items-center justify-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent"></div>
                </div>
            </div>
        );
    }

    if (error || !actor) {
        return (
            <div className="min-h-screen bg-background text-foreground">
                <Navbar />
                <div className="h-[60vh] flex flex-col items-center justify-center">
                    <h2 className="text-2xl mb-4 text-destructive">{error || "Attore non trovato"}</h2>
                    <Button onClick={() => router.back()}>Torna Indietro</Button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background text-foreground">
            <SEO
                title={actor.name}
                description={`Biografia, filmografia e dettagli di ${actor.name}`}
                image={actor.profile_path ? tmdbApi.getImageUrl(actor.profile_path, "w500") : undefined}
                url={seoUrl || undefined}
                jsonLd={seoJsonLd || undefined}
            />
            <Navbar />

            <main className="container mx-auto px-4 py-8 animate-in fade-in slide-in-from-bottom-8 duration-700 pt-24">
                <Link href="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-accent mb-6">
                    <ArrowLeft className="h-4 w-4 mr-1" /> Torna indietro
                </Link>

                <div className="flex flex-col md:flex-row gap-10">
                    {/* Sidebar Left: Image & Info */}
                    <div className="w-full md:w-1/3 lg:w-1/4">
                        <div className="rounded-xl overflow-hidden shadow-2xl border border-white/10 mb-6">
                            <OptimizedImage
                                src={actor.profile_path ? tmdbApi.getImageUrl(actor.profile_path, "w500") : "https://via.placeholder.com/500x750?text=No+Image"}
                                alt={actor.name}
                                className="w-full h-auto object-cover"
                                loading="lazy"
                            />
                        </div>

                        <div className="space-y-4 bg-secondary/10 p-6 rounded-xl border border-white/5">
                            <h3 className="font-semibold text-xl mb-4 border-b border-white/10 pb-2">Info Personali</h3>
                            <div>
                                <span className="block text-sm text-muted-foreground">Professione</span>
                                <span className="font-medium">{actor.known_for_department}</span>
                            </div>
                            <div>
                                <span className="block text-sm text-muted-foreground">Genere</span>
                                <span className="font-medium">{getGender(actor.gender)}</span>
                            </div>
                            <div>
                                <span className="block text-sm text-muted-foreground">Data di Nascita</span>
                                <span className="font-medium">{formatDate(actor.birthday)}</span>
                                {actor.birthday && !actor.deathday && <span className="text-sm text-muted-foreground ml-2">({calculateAge(actor.birthday, null)} anni)</span>}
                            </div>
                            {actor.place_of_birth && (
                                <div>
                                    <span className="block text-sm text-muted-foreground">Luogo di Nascita</span>
                                    <span className="font-medium">{actor.place_of_birth}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Main Content: Bio & Credits */}
                    <div className="w-full md:w-2/3 lg:w-3/4">
                        <h1 className="text-4xl md:text-5xl font-bold mb-6">{actor.name}</h1>

                        <div className="mb-10">
                            <h2 className="text-2xl font-semibold mb-4 text-accent">Biografia</h2>
                            <div className="prose prose-invert max-w-none text-gray-300 leading-relaxed">
                                {isTranslating ? (
                                    <div className="flex items-center gap-2 text-muted-foreground">
                                        <span className="animate-spin">⏳</span> Traduzione in corso...
                                    </div>
                                ) : (
                                    <p>{translatedBio || actor.biography || "Nessuna biografia disponibile."}</p>
                                )}
                                {translatedBio && <p className="text-xs text-muted-foreground italic mt-2">* Tradotto automaticamente</p>}
                            </div>
                        </div>

                        <div>
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-2xl font-semibold text-accent flex items-center gap-2">
                                    <Film className="h-6 w-6" /> Filmografia
                                </h2>

                                {/* Filters */}
                                <div className="flex bg-secondary/20 p-1 rounded-lg">
                                    <button
                                        onClick={() => setFilter('all')}
                                        className={`px-4 py-1.5 text-sm rounded-md transition-all ${filter === 'all' ? 'bg-accent text-white shadow' : 'hover:text-white text-muted-foreground'}`}
                                    >
                                        Tutti
                                    </button>
                                    <button
                                        onClick={() => setFilter('movie')}
                                        className={`px-4 py-1.5 text-sm rounded-md transition-all ${filter === 'movie' ? 'bg-accent text-white shadow' : 'hover:text-white text-muted-foreground'}`}
                                    >
                                        Film
                                    </button>
                                    <button
                                        onClick={() => setFilter('tv')}
                                        className={`px-4 py-1.5 text-sm rounded-md transition-all ${filter === 'tv' ? 'bg-accent text-white shadow' : 'hover:text-white text-muted-foreground'}`}
                                    >
                                        Serie TV
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                                {filteredCredits.map(credit => (
                                    <Link
                                        href={`/${credit.media_type}/${credit.id}`}
                                        key={`${credit.media_type}-${credit.id}`}
                                        className="group relative bg-black/40 rounded-lg overflow-hidden border border-white/5 hover:border-accent/50 transition-all hover:scale-[1.02]"
                                    >
                                        <div className="aspect-[2/3] overflow-hidden">
                                            <OptimizedImage
                                                src={tmdbApi.getImageUrl(credit.poster_path || "", "w342")}       
                                                alt={credit.title || credit.name || "Poster"}
                                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                                loading="lazy"
                                            />
                                        </div>
                                        <div className="p-3">
                                            <h4 className="font-semibold line-clamp-1 group-hover:text-accent transition-colors">{credit.title || credit.name}</h4>
                                            <div className="flex justify-between items-center mt-2 text-xs text-muted-foreground">
                                                <span>{(credit.release_date || credit.first_air_date)?.substring(0, 4) || "N/A"}</span>
                                                <span className="flex items-center gap-1 text-yellow-500">
                                                    <Star className="h-3 w-3 fill-current" />
                                                    {credit.vote_average ? credit.vote_average.toFixed(1) : "-"}
                                                </span>
                                            </div>
                                            {credit.character && (
                                                <p className="text-xs text-gray-400 mt-1 line-clamp-1 italic">come {credit.character}</p>
                                            )}
                                        </div>
                                    </Link>
                                ))}
                            </div>

                            {filteredCredits.length === 0 && (
                                <div className="text-center py-20 text-muted-foreground">
                                    Nessun titolo trovato con questo filtro.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </main>
            <Footer />
        </div>
    );
};

export default PersonDetailsPage;
