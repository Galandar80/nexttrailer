
import React, { useState, useEffect } from "react";
import { 
  Carousel, 
  CarouselContent, 
  CarouselItem, 
  CarouselNext, 
  CarouselPrevious 
} from "@/components/ui/carousel";
import { Download, X } from "lucide-react";
import { tmdbApi } from "@/services/tmdbApi";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { OptimizedImage } from "@/components/OptimizedImage";

interface Image {
  file_path: string;
  aspect_ratio: number;
  height: number;
  width: number;
  vote_average?: number;
  iso_639_1?: string | null;
}

interface MediaGalleryProps {
  mediaId: number;
  mediaType: "movie" | "tv";
  onClose: () => void;
}

const MediaGallery = ({ mediaId, mediaType, onClose }: MediaGalleryProps) => {
  const [images, setImages] = useState<{ posters: Image[], backdrops: Image[] }>({
    posters: [],
    backdrops: []
  });
  const [activeTab, setActiveTab] = useState<"posters" | "backdrops">("backdrops");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const { toast } = useToast();

  useEffect(() => {
    const fetchImages = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(
          `https://api.themoviedb.org/3/${mediaType}/${mediaId}/images`,
          {
            headers: {
              Authorization: `Bearer eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiJmM2EzZjY2YjZmOTY5N2E1YTkwOGQ4NmM2MDdiYTExNSIsIm5iZiI6MTc0MzI3MTMwMS45ODcsInN1YiI6IjY3ZTgzNTg1NjIxNDUyNWNkNTYzOGNmNSIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.V3uqyFMxYc-dOO50-qECpuGlSagrYTLyZObb43XG-Sc`,
              "Content-Type": "application/json"
            }
          }
        );
        
        if (!response.ok) {
          throw new Error("Errore nel caricamento delle immagini");
        }
        
        const data = await response.json();
        
        // Filtra le immagini per lingua italiana o senza specificazione di lingua
        const filteredPosters = data.posters?.filter((img: Image) => 
          !img.iso_639_1 || img.iso_639_1 === "it" || img.iso_639_1 === "en"
        ) || [];
        
        const filteredBackdrops = data.backdrops?.filter((img: Image) => 
          !img.iso_639_1 || img.iso_639_1 === "it" || img.iso_639_1 === "en"
        ) || [];
        
        setImages({
          posters: filteredPosters,
          backdrops: filteredBackdrops
        });
      } catch (err) {
        console.error("Errore nel caricamento delle immagini:", err);
        setError("Impossibile caricare le immagini. Riprova più tardi.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchImages();
  }, [mediaId, mediaType]);

  const handleDownload = async (imagePath: string, type: string) => {
    try {
      const imageUrl = tmdbApi.getImageUrl(imagePath, "original");
      
      // Creazione di un link temporaneo per il download
      const link = document.createElement('a');
      link.href = imageUrl;
      link.download = `${mediaType}-${mediaId}-${type}-${Date.now()}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast({
        title: "Download avviato",
        description: "L'immagine verrà scaricata a breve",
        variant: "default"
      });
    } catch (error) {
      console.error("Errore durante il download:", error);
      toast({
        title: "Errore durante il download",
        description: "Non è stato possibile scaricare l'immagine",
        variant: "destructive"
      });
    }
  };

  const activeImages = activeTab === "posters" ? images.posters : images.backdrops;

  return (
    <div className="fixed inset-0 z-50 bg-black/90 overflow-y-auto">
      <div className="max-w-6xl mx-auto p-4 pt-16">
        <Button 
          className="absolute top-4 right-4 bg-red-600 hover:bg-red-700 text-white" 
          onClick={onClose}
        >
          <X className="h-4 w-4 mr-2" />
          Chiudi
        </Button>
        
        <h2 className="text-2xl font-bold mb-6 text-white">Poster e Immagini</h2>
        
        <div className="mb-6">
          <div className="flex space-x-4 border-b border-secondary/30">
            <button 
              className={`pb-2 px-4 text-lg font-medium relative ${
                activeTab === "backdrops" 
                  ? "text-accent" 
                  : "text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => setActiveTab("backdrops")}
            >
              Immagini ({images.backdrops.length})
              {activeTab === "backdrops" && (
                <span className="absolute bottom-0 left-0 w-full h-0.5 bg-accent"></span>
              )}
            </button>
            <button 
              className={`pb-2 px-4 text-lg font-medium relative ${
                activeTab === "posters" 
                  ? "text-accent" 
                  : "text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => setActiveTab("posters")}
            >
              Poster ({images.posters.length})
              {activeTab === "posters" && (
                <span className="absolute bottom-0 left-0 w-full h-0.5 bg-accent"></span>
              )}
            </button>
          </div>
        </div>
        
        {isLoading ? (
          <div className="flex justify-center p-10">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-accent"></div>
          </div>
        ) : error ? (
          <div className="bg-destructive/20 p-4 rounded-md">
            <p className="text-destructive-foreground">{error}</p>
          </div>
        ) : activeImages.length === 0 ? (
          <div className="bg-secondary/20 p-6 rounded-md text-center">
            <p>Nessuna immagine disponibile per questa categoria</p>
          </div>
        ) : (
          <div className="relative">
            <Carousel
              className="w-full"
              setApi={(api) => {
                api?.on("select", () => {
                  setCurrentImageIndex(api.selectedScrollSnap());
                });
              }}
            >
              <CarouselContent>
                {activeImages.map((image, index) => (
                  <CarouselItem key={image.file_path} className="relative">
                    <div className={`
                      relative overflow-hidden rounded-lg
                      ${activeTab === "posters" ? "w-[calc(100vh*0.666)] max-w-full mx-auto" : "w-full"}
                    `}>
                      <OptimizedImage
                        src={tmdbApi.getImageUrl(image.file_path, activeTab === "posters" ? "w780" : "original")}
                        alt={`${mediaType} ${activeTab === "posters" ? "poster" : "backdrop"} ${index + 1}`}
                        className={`
                          w-full object-contain
                          ${activeTab === "posters" ? "max-h-[80vh]" : "max-h-[70vh]"}
                        `}
                        loading="lazy"
                      />
                      <div className="absolute bottom-0 right-0 m-4">
                        <Button
                          variant="secondary"
                          size="sm"
                          className="bg-black/60 hover:bg-black/80"
                          onClick={() => handleDownload(image.file_path, activeTab)}
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Scarica
                        </Button>
                      </div>
                    </div>
                  </CarouselItem>
                ))}
              </CarouselContent>
              <CarouselPrevious className="left-2 md:left-4" />
              <CarouselNext className="right-2 md:right-4" />
            </Carousel>
            
            <div className="mt-6 text-center">
              <p className="text-muted-foreground">
                {currentImageIndex + 1} di {activeImages.length}
              </p>
            </div>
            
            {/* Thumbnails preview */}
            <div className="mt-6 overflow-x-auto pb-4">
              <div className="flex space-x-2">
                {activeImages.map((image, index) => (
                  <button
                    key={image.file_path + "-thumb"}
                    className={`
                      flex-shrink-0 overflow-hidden rounded-md transition-all
                      ${currentImageIndex === index ? "ring-2 ring-accent" : "opacity-70 hover:opacity-100"}
                      ${activeTab === "posters" ? "w-16 h-24" : "w-32 h-16"}
                    `}
                    onClick={() => {
                      setCurrentImageIndex(index);
                    }}
                  >
                    <OptimizedImage
                      src={tmdbApi.getImageUrl(image.file_path, "w185")}
                      alt={`Thumbnail ${index + 1}`}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MediaGallery;
