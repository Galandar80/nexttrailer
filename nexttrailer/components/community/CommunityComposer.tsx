import type { User } from "firebase/auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { MediaItem } from "@/services/tmdbApi";
import type { ThoughtTarget, ThoughtTargetType, ThoughtVisibility } from "./types";

type CommunityComposerProps = {
  user: User | null;
  thoughtText: string;
  onThoughtTextChange: (value: string) => void;
  thoughtVisibility: ThoughtVisibility;
  onThoughtVisibilityChange: (value: ThoughtVisibility) => void;
  targetType: ThoughtTargetType;
  onTargetTypeChange: (value: ThoughtTargetType) => void;
  targetQuery: string;
  onTargetQueryChange: (value: string) => void;
  selectedTarget: ThoughtTarget | null;
  onClearTarget: () => void;
  targetResults: MediaItem[];
  isSearchingTarget: boolean;
  onSearchTarget: () => void;
  onSelectTarget: (item: MediaItem) => void;
  isPosting: boolean;
  onShare: () => void;
};

const CommunityComposer = ({
  user,
  thoughtText,
  onThoughtTextChange,
  thoughtVisibility,
  onThoughtVisibilityChange,
  targetType,
  onTargetTypeChange,
  targetQuery,
  onTargetQueryChange,
  selectedTarget,
  onClearTarget,
  targetResults,
  isSearchingTarget,
  onSearchTarget,
  onSelectTarget,
  isPosting,
  onShare
}: CommunityComposerProps) => {
  return (
    <div className="bg-secondary/10 rounded-lg p-4 border border-white/5 space-y-3">
      <div className="flex items-center gap-3">
        <Avatar className="h-10 w-10">
          <AvatarImage src={user?.photoURL || undefined} alt={user?.displayName || "Utente"} />
          <AvatarFallback className="bg-accent/10 text-accent">
            {user?.displayName?.charAt(0) || "U"}
          </AvatarFallback>
        </Avatar>
        <div className="text-sm text-muted-foreground">Condividi un pensiero con la community</div>
      </div>
      <Textarea
        value={thoughtText}
        onChange={(event) => onThoughtTextChange(event.target.value)}
        placeholder="Scrivi un pensiero su film, serie o news..."
        className="min-h-[110px]"
      />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:flex-1">
          <div className="w-full sm:w-60">
            <Select value={thoughtVisibility} onValueChange={(value) => onThoughtVisibilityChange(value as ThoughtVisibility)}>
              <SelectTrigger>
                <SelectValue placeholder="Visibilità" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="public">Pubblico</SelectItem>
                <SelectItem value="followers">Solo follower</SelectItem>
                <SelectItem value="private">Privato</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="w-full sm:w-64">
            <Select value={targetType} onValueChange={(value) => onTargetTypeChange(value as ThoughtTargetType)}>
              <SelectTrigger>
                <SelectValue placeholder="Target" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nessun target</SelectItem>
                <SelectItem value="movie">Film</SelectItem>
                <SelectItem value="tv">Serie TV</SelectItem>
                <SelectItem value="content">Contenuto</SelectItem>
                <SelectItem value="person">Attore</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <Button onClick={onShare} disabled={isPosting}>
          {isPosting ? "Condivisione..." : "Condividi"}
        </Button>
      </div>
      {targetType !== "none" && (
        <div className="space-y-2">
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              value={targetQuery}
              onChange={(event) => onTargetQueryChange(event.target.value)}
              placeholder="Cerca un titolo o attore"
            />
            <Button variant="outline" onClick={onSearchTarget} disabled={isSearchingTarget}>
              {isSearchingTarget ? "Ricerca..." : "Cerca"}
            </Button>
          </div>
          {selectedTarget && (
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="bg-accent/10 text-accent px-2 py-1 rounded-md">
                {selectedTarget.title}
              </span>
              <Button variant="ghost" size="sm" onClick={onClearTarget}>
                Rimuovi
              </Button>
            </div>
          )}
          {targetResults.length > 0 && (
            <div className="grid gap-2">
              {targetResults.map((item) => {
                const title = "title" in item ? item.title : "name" in item ? item.name : "";
                const label = item.media_type === "movie" ? "Film" : item.media_type === "tv" ? "Serie TV" : "Attore";
                return (
                  <button
                    key={`${item.media_type}-${item.id}`}
                    type="button"
                    onClick={() => onSelectTarget(item)}
                    className="w-full text-left bg-secondary/10 hover:bg-secondary/20 border border-white/5 rounded-md px-3 py-2 text-sm"
                  >
                    <div className="font-semibold">{title || "Contenuto"}</div>
                    <div className="text-xs text-muted-foreground">{label}</div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CommunityComposer;
