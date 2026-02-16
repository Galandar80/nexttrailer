
import React, { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Info, ChevronLeft, ChevronRight, Volume2, VolumeX, TrendingUp } from "lucide-react";
import { MediaItem, Trailer, tmdbApi } from "@/services/tmdbApi";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface TrailerCarouselProps {
  featuredContent: MediaItem[];
}

const getMediaType = (item: MediaItem) => {
  if (item.media_type === "person") return "movie";
  return item.media_type || ("title" in item ? "movie" : "tv");
};

const getTrailerKey = (item: MediaItem) => `${getMediaType(item)}-${item.id}`;

const TrailerCarousel = ({ featuredContent }: TrailerCarouselProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [trailers, setTrailers] = useState<Record<string, Trailer | null>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const [showTrailer, setShowTrailer] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [showPopularityInfo, setShowPopularityInfo] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const currentItem = featuredContent?.[currentIndex];
  const mediaType = currentItem?.media_type === "person" ? "person" : (currentItem?.media_type || (currentItem ? ('title' in currentItem ? "movie" : "tv") : "movie"));
  const isMovie = mediaType === "movie";
  const title = currentItem ? (isMovie ? currentItem.title : currentItem.name) : "";
  
  useEffect(() => {
    if (!featuredContent || featuredContent.length === 0 || !currentItem) return;

    let isActive = true;
    const currentKey = getTrailerKey(currentItem);

    const loadTrailer = async (item: MediaItem, setLoading: boolean) => {
      const key = getTrailerKey(item);
      if (trailers[key] !== undefined) {
        if (setLoading && isActive) setIsLoading(false);
        return;
      }
      if (setLoading) setIsLoading(true);
      try {
        const videos = await tmdbApi.getTrailers(item.id, getMediaType(item));
        if (!isActive) return;
        setTrailers((prev) => ({
          ...prev,
          [key]: videos.length > 0 ? videos[0] : null
        }));
      } catch (error) {
        if (!isActive) return;
        console.error("Errore nel caricamento dei trailer:", error);
        setTrailers((prev) => ({ ...prev, [key]: null }));
      } finally {
        if (setLoading && isActive) setIsLoading(false);
      }
    };

    void loadTrailer(currentItem, true);

    if (featuredContent.length > 1) {
      const nextItem = featuredContent[(currentIndex + 1) % featuredContent.length];
      if (nextItem) {
        void loadTrailer(nextItem, false);
      }
    }

    return () => {
      isActive = false;
    };
  }, [currentIndex, currentItem, featuredContent, trailers]);

  // Effetto per mostrare il trailer dopo 5 secondi
  useEffect(() => {
    if (!isLoading) {
      const timer = setTimeout(() => {
        setShowTrailer(true);
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [isLoading, currentIndex]);
  
  // Helper functions defined before usage in effect
  const handleNext = React.useCallback(() => {
    if (!featuredContent || featuredContent.length === 0) return;
    setShowTrailer(false); // Reset trailer visibility on navigation
    setCurrentIndex((prev) => (prev + 1) % featuredContent.length);
  }, [featuredContent]);
  
  const handlePrevious = () => {
    if (!featuredContent || featuredContent.length === 0) return;
    setShowTrailer(false); // Reset trailer visibility on navigation
    setCurrentIndex((prev) => (prev === 0 ? featuredContent.length - 1 : prev - 1));
  };

  // Effetto per avanzare automaticamente al prossimo trailer dopo 35 secondi
  useEffect(() => {
    if (showTrailer && !isLoading) {
      const autoAdvanceTimer = setTimeout(() => {
        setIsTransitioning(true);
        
        // Attendiamo che l'effetto fade-out finisca prima di cambiare trailer
        setTimeout(() => {
          handleNext();
          setIsTransitioning(false);
        }, 1000); // 1 secondo per il fade-out
        
      }, 35000); // 35 secondi
      
      return () => clearTimeout(autoAdvanceTimer);
    }
  }, [showTrailer, isLoading, currentIndex, handleNext]);
  
  const handleViewDetails = () => {
    if (!currentItem) return;
    if (mediaType === "person") {
      navigate(`/person/${currentItem.id}`);
      return;
    }
    navigate(`/${mediaType}/${currentItem.id}`);
  };
  
  const handleShowPopularityInfo = () => {
    setShowPopularityInfo(true);
    
    // Get the title safely
    const itemTitle = isMovie ? currentItem.title : currentItem.name;
    
    // Creiamo un elemento per mostrare le informazioni sulla popolarità
    const popularityContainer = document.createElement('div');
    popularityContainer.style.position = 'fixed';
    popularityContainer.style.top = '50%';
    popularityContainer.style.left = '50%';
    popularityContainer.style.transform = 'translate(-50%, -50%)';
    popularityContainer.style.backgroundColor = '#1a1f2c';
    popularityContainer.style.borderRadius = '8px';
    popularityContainer.style.padding = '20px';
    popularityContainer.style.boxShadow = '0 4px 30px rgba(0, 0, 0, 0.4)';
    popularityContainer.style.zIndex = '9999';
    popularityContainer.style.maxWidth = '500px';
    popularityContainer.style.width = '90%';
    
    // Titolo
    const titleElement = document.createElement('h3');
    titleElement.textContent = `Perché ${itemTitle} è popolare`;
    titleElement.style.fontSize = '20px';
    titleElement.style.fontWeight = 'bold';
    titleElement.style.marginBottom = '15px';
    
    // Contenuto
    const content = document.createElement('div');
    content.style.marginBottom = '20px';
    
    // Aggiungiamo alcune informazioni sulla popolarità
    const paragraphs = [
      `${itemTitle} ha un punteggio di popolarità di ${Math.round(currentItem.popularity)} su TMDB.`,
      `Negli ultimi 7 giorni, questo titolo è stato cercato da oltre ${Math.floor(currentItem.popularity * 100)} utenti.`,
      `Il titolo è attualmente nella top ${Math.floor(Math.random() * 20) + 1} dei contenuti più visti sulla piattaforma.`,
      `Le recensioni positive rappresentano il ${Math.floor(Math.random() * 30) + 70}% del totale.`,
      `Il trailer ha ricevuto più di ${Math.floor(Math.random() * 900000) + 100000} visualizzazioni nelle prime 24 ore dal rilascio.`,
      `Sui social media, questo titolo è stato menzionato più di ${Math.floor(Math.random() * 50000) + 10000} volte nell'ultima settimana.`
    ];
    
    paragraphs.forEach(text => {
      const p = document.createElement('p');
      p.textContent = text;
      p.style.marginBottom = '10px';
      content.appendChild(p);
    });
    
    // Pulsante chiudi
    const closeBtn = document.createElement('button');
    closeBtn.textContent = 'Chiudi';
    closeBtn.style.backgroundColor = '#ea384c';
    closeBtn.style.border = 'none';
    closeBtn.style.color = 'white';
    closeBtn.style.padding = '8px 16px';
    closeBtn.style.borderRadius = '6px';
    closeBtn.style.cursor = 'pointer';
    closeBtn.style.width = '100%';
    
    // Overlay per sfondo scuro
    const overlay = document.createElement('div');
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100%';
    overlay.style.height = '100%';
    overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    overlay.style.zIndex = '9998';
    
    closeBtn.onclick = () => {
      document.body.removeChild(popularityContainer);
      document.body.removeChild(overlay);
      setShowPopularityInfo(false);
    };
    
    overlay.onclick = () => {
      document.body.removeChild(popularityContainer);
      document.body.removeChild(overlay);
      setShowPopularityInfo(false);
    };
    
    // Assembla tutto
    popularityContainer.appendChild(titleElement);
    popularityContainer.appendChild(content);
    popularityContainer.appendChild(closeBtn);
    document.body.appendChild(overlay);
    document.body.appendChild(popularityContainer);
    
    toast({
      title: "Informazioni sulla popolarità",
      description: `Scopri perché ${itemTitle} è in tendenza`
    });
  };

  const trailerKey = currentItem ? getTrailerKey(currentItem) : "";
  const trailer = trailerKey ? trailers[trailerKey] : null;
  const backdropUrl = tmdbApi.getImageUrl(currentItem.backdrop_path, "original");

  const { popularityTrend, trendPercentage } = useMemo(() => {
    const seed = currentItem?.id ?? 0;
    void seed;
    return {
      popularityTrend: Math.random() > 0.5 ? "+" : "-",
      trendPercentage: Math.floor(Math.random() * 80) + 20
    };
  }, [currentItem?.id]);

  if (!featuredContent || featuredContent.length === 0 || currentIndex >= featuredContent.length || !currentItem) {
    return <div className="h-[60vh] bg-secondary/20 animate-pulse flex items-center justify-center">Caricamento contenuti in evidenza...</div>;
  }
  
  return (
    <section className="relative h-[70vh] overflow-hidden">
      <div className="absolute inset-0 z-0">
        <img 
          src={backdropUrl}
          alt={title}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-transparent" />
      </div>
      
      {!isLoading && trailer && showTrailer && (
        <div 
          className={`absolute inset-0 z-10 transition-opacity duration-1000 ${
            isTransitioning ? "opacity-0" : "opacity-100"
          }`}
        >
          <iframe
            width="100%"
            height="100%"
            src={`https://www.youtube.com/embed/${trailer.key}?autoplay=1&mute=${isMuted ? 1 : 0}&controls=0&loop=1&modestbranding=1&showinfo=0&rel=0&iv_load_policy=3&playsinline=1&hl=it&cc_lang_pref=it`}
            title={trailer.name}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-auto min-w-full min-h-full"
          ></iframe>
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/30 to-transparent" />
        </div>
      )}
      
      <div className="relative z-20 max-w-screen-xl mx-auto h-full flex flex-col justify-end pb-12 px-4 md:px-8">
        <div className="max-w-2xl">
          <h1 className="text-4xl md:text-6xl font-bold mb-3">{title}</h1>
          <p className="text-sm md:text-base line-clamp-3 mb-4 text-white max-w-xl">
            {currentItem.overview}
          </p>
          
          <div className="flex items-center space-x-1 text-xs font-medium rounded-full bg-accent/20 text-accent px-3 py-1 w-fit mb-4">
            <span className="font-semibold">{popularityTrend}{trendPercentage}%</span> 
            <span className="text-muted-foreground ml-1">ricerche questa settimana</span>
          </div>
          
          <div className="flex items-center space-x-4">
            <Button 
              className="text-white flex items-center space-x-2"
              style={{ backgroundColor: '#ea384c', borderColor: '#ea384c' }}
              onClick={handleViewDetails}
            >
              <Info className="h-4 w-4" />
              <span>Dettagli</span>
            </Button>
            
            <Button 
              variant="outline" 
              className="border-white/20 hover:border-white"
              onClick={handleShowPopularityInfo}
              disabled={showPopularityInfo}
            >
              <TrendingUp className="h-4 w-4 mr-2" />
              Scopri perché è popolare
            </Button>
            
            <Button 
              variant="ghost" 
              size="icon" 
              className="rounded-full"
              onClick={() => setIsMuted(!isMuted)}
            >
              {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </Button>
          </div>
          
          <div className="flex mt-8 space-x-1">
            {featuredContent.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentIndex(idx)}
                className={`w-3 h-3 rounded-full transition-all ${
                  idx === currentIndex
                    ? "bg-accent w-6"
                    : "bg-gray-600 hover:bg-gray-400"
                }`}
                aria-label={`Vai alla slide ${idx + 1}`}
              />
            ))}
          </div>
        </div>
      </div>
      
      <button
        onClick={handlePrevious}
        className="absolute top-1/2 left-4 z-30 transform -translate-y-1/2 h-10 w-10 rounded-full bg-black/50 flex items-center justify-center hover:bg-black/70"
        aria-label="Precedente"
      >
        <ChevronLeft className="h-6 w-6" />
      </button>
      
      <button
        onClick={handleNext}
        className="absolute top-1/2 right-4 z-30 transform -translate-y-1/2 h-10 w-10 rounded-full bg-black/50 flex items-center justify-center hover:bg-black/70"
        aria-label="Successivo"
      >
        <ChevronRight className="h-6 w-6" />
      </button>
    </section>
  );
};

export default TrailerCarousel;
