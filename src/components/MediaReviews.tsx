
import React, { useState, useEffect } from "react";
import { Star, User, X } from "lucide-react";
import { tmdbApi } from "@/services/tmdbApi";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { OptimizedImage } from "@/components/OptimizedImage";

interface Review {
  author: string;
  content: string;
  created_at: string;
  author_details?: {
    rating?: number;
    avatar_path?: string;
  };
  id: string;
  url: string;
  translated_content?: string;
}

interface MediaReviewsProps {
  mediaId: number;
  mediaType: "movie" | "tv";
  onClose: () => void;
}

const MediaReviews = ({ mediaId, mediaType, onClose }: MediaReviewsProps) => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const { toast } = useToast();

  const translateReviews = React.useCallback(async (reviewsToTranslate: Review[]) => {
    if (!reviewsToTranslate.length) return;
    
    setIsTranslating(true);
    
    try {
      const translatedReviews = await Promise.all(
        reviewsToTranslate.map(async (review) => {
          try {
            const translationResponse = await fetch(
              `https://api.mymemory.translated.net/get?q=${encodeURIComponent(
                review.content.substring(0, 500) // Limitiamo la lunghezza per non superare i limiti dell'API
              )}&langpair=en|it`
            );
            
            if (!translationResponse.ok) {
              throw new Error("Errore durante la traduzione");
            }
            
            const translationData = await translationResponse.json();
            
            if (translationData.responseStatus === 200 && translationData.responseData) {
              return {
                ...review,
                translated_content: translationData.responseData.translatedText
              };
            }
            return review;
          } catch (err) {
            console.error("Errore durante la traduzione:", err);
            return review;
          }
        })
      );
      
      setReviews(translatedReviews);
    } catch (err) {
      console.error("Errore durante la traduzione delle recensioni:", err);
      toast({
        title: "Errore di traduzione",
        description: "Non è stato possibile tradurre alcune recensioni",
        variant: "destructive",
      });
    } finally {
      setIsTranslating(false);
    }
  }, [toast]);

  useEffect(() => {
    const fetchReviews = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(
          `https://api.themoviedb.org/3/${mediaType}/${mediaId}/reviews`,
          {
            headers: {
              Authorization: `Bearer eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiJmM2EzZjY2YjZmOTY5N2E1YTkwOGQ4NmM2MDdiYTExNSIsIm5iZiI6MTc0MzI3MTMwMS45ODcsInN1YiI6IjY3ZTgzNTg1NjIxNDUyNWNkNTYzOGNmNSIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.V3uqyFMxYc-dOO50-qECpuGlSagrYTLyZObb43XG-Sc`,
              "Content-Type": "application/json"
            }
          }
        );
        
        if (!response.ok) {
          throw new Error("Errore nel caricamento delle recensioni");
        }
        
        const data = await response.json();
        
        if (data.results && data.results.length > 0) {
          setReviews(data.results);
          translateReviews(data.results);
        } else {
          setReviews([]);
        }
      } catch (err) {
        console.error("Errore nel caricamento delle recensioni:", err);
        setError("Impossibile caricare le recensioni. Riprova più tardi.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchReviews();
  }, [mediaId, mediaType, translateReviews]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("it-IT", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const getAvatarUrl = (path: string | undefined) => {
    if (!path) return "https://www.gravatar.com/avatar?d=mp";
    if (path.startsWith("/http")) {
      return path.substring(1);
    }
    return tmdbApi.getImageUrl(path, "w185");
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/90 overflow-y-auto">
      <div className="max-w-4xl mx-auto p-4 pt-16">
        <Button 
          className="absolute top-4 right-4 bg-red-600 hover:bg-red-700 text-white" 
          onClick={onClose}
        >
          <X className="h-4 w-4 mr-2" />
          Chiudi
        </Button>
        
        <h2 className="text-2xl font-bold mb-6 text-white">Recensioni</h2>
        
        {isLoading ? (
          <div className="flex justify-center p-10">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-accent"></div>
          </div>
        ) : error ? (
          <div className="bg-destructive/20 p-4 rounded-md">
            <p className="text-destructive-foreground">{error}</p>
          </div>
        ) : reviews.length === 0 ? (
          <div className="bg-secondary/20 p-6 rounded-md text-center">
            <p>Non ci sono recensioni disponibili per questo contenuto.</p>
          </div>
        ) : (
          <>
            {isTranslating && (
              <div className="mb-4 p-3 bg-secondary/20 rounded-md">
                <p className="flex items-center justify-center">
                  <span className="animate-pulse mr-2 inline-block h-2 w-2 rounded-full bg-accent"></span>
                  Traduzione in corso...
                </p>
              </div>
            )}
            <div className="space-y-6">
              {reviews.map((review) => (
                <div 
                  key={review.id} 
                  className="bg-secondary/20 rounded-lg p-4 border border-secondary/30"
                >
                  <div className="flex items-center mb-2">
                    <div className="w-10 h-10 rounded-full overflow-hidden mr-3">
                      <OptimizedImage
                        src={getAvatarUrl(review.author_details?.avatar_path) || "https://www.gravatar.com/avatar?d=mp"}
                        alt={review.author}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    </div>
                    <div>
                      <h3 className="font-medium">{review.author}</h3>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(review.created_at)}
                      </p>
                    </div>
                    {review.author_details?.rating && (
                      <div className="ml-auto flex items-center">
                        <Star className="h-4 w-4 text-yellow-500 fill-yellow-500 mr-1" />
                        <span>{review.author_details.rating / 2}</span>
                        <span className="text-xs ml-1">/5</span>
                      </div>
                    )}
                  </div>
                  <div className="mt-3 text-sm">
                    {review.translated_content ? (
                      <div>
                        <p className="whitespace-pre-line">{review.translated_content}</p>
                        <p className="text-xs text-muted-foreground mt-2 italic">
                          Tradotto automaticamente dall'inglese
                        </p>
                      </div>
                    ) : (
                      <p className="whitespace-pre-line">{review.content}</p>
                    )}
                  </div>
                  <div className="mt-3 pt-2 border-t border-secondary/30">
                    <a 
                      href={review.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-xs text-accent hover:underline"
                    >
                      Leggi la recensione completa
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default MediaReviews;
