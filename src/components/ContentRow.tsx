
import React, { useMemo, useState, useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { MediaItem } from "@/services/tmdbApi";
import MovieCard from "./MovieCard";

interface ContentRowProps {
  title: string;
  items: MediaItem[];
  icon?: React.ReactNode;
  showBadges?: boolean;
}

const ContentRow = ({ title, items, icon, showBadges = false }: ContentRowProps) => {
  const [scrollPosition, setScrollPosition] = useState(0);
  const rowRef = useRef<HTMLDivElement>(null);
  
  const scroll = (direction: "left" | "right") => {
    if (!rowRef.current) return;
    
    const { current } = rowRef;
    const scrollAmount = 300;
    const maxScroll = current.scrollWidth - current.clientWidth;
    
    if (direction === "left") {
      const newPosition = Math.max(scrollPosition - scrollAmount, 0);
      current.scrollTo({ left: newPosition, behavior: "smooth" });
      setScrollPosition(newPosition);
    } else {
      const newPosition = Math.min(scrollPosition + scrollAmount, maxScroll);
      current.scrollTo({ left: newPosition, behavior: "smooth" });
      setScrollPosition(newPosition);
    }
  };
  
  const similarTitles = useMemo(() => {
    if (items.length <= 1) return items.map(() => "");
    return items.map((_, currentIndex) => {
      const availableItems = items.filter((_, i) => i !== currentIndex);
      const randomItem = availableItems[Math.floor(Math.random() * availableItems.length)];
      return "title" in randomItem ? randomItem.title : randomItem.name;
    });
  }, [items]);

  return (
    <div className="content-section">
      <div className="flex justify-between items-center mb-4">
        <h2 className="section-title">
          {icon && <span className="mr-2">{icon}</span>}
          {title}
        </h2>
        
        <div className="flex space-x-2">
          <button 
            onClick={() => scroll("left")}
            className="p-1 rounded-full bg-secondary/50 hover:bg-secondary"
            aria-label="Scroll left"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button 
            onClick={() => scroll("right")}
            className="p-1 rounded-full bg-secondary/50 hover:bg-secondary"
            aria-label="Scroll right"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>
      
      <div 
        className="content-row"
        ref={rowRef}
      >
        {items.map((item, idx) => (
          <div key={item.id} className="flex-shrink-0 w-[180px]">
            <MovieCard 
              media={item} 
              showBadge={showBadges} 
              similarTitle={similarTitles[idx]}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default ContentRow;
