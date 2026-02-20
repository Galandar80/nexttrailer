import { Link } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ProfileSummary } from "./types";

type CommunitySidebarProps = {
  userId?: string;
  userSearchQuery: string;
  onUserSearchQueryChange: (value: string) => void;
  onSearchUsers: () => void;
  isSearchingUsers: boolean;
  userSearchResults: ProfileSummary[];
  followedIds: Set<string>;
  suggestions: ProfileSummary[];
  onToggleFollow: (id: string) => void;
};

const CommunitySidebar = ({
  userId,
  userSearchQuery,
  onUserSearchQueryChange,
  onSearchUsers,
  isSearchingUsers,
  userSearchResults,
  followedIds,
  suggestions,
  onToggleFollow
}: CommunitySidebarProps) => {
  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <h2 className="text-xl font-semibold">Cerca utenti</h2>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            value={userSearchQuery}
            onChange={(event) => onUserSearchQueryChange(event.target.value)}
            placeholder="Cerca per nome o bio..."
          />
          <Button variant="outline" onClick={onSearchUsers} disabled={isSearchingUsers}>
            {isSearchingUsers ? "Cerca..." : "Cerca"}
          </Button>
        </div>
        {userSearchQuery.trim().length > 0 && userSearchResults.length === 0 && !isSearchingUsers && (
          <div className="text-xs text-muted-foreground">Nessun utente trovato.</div>
        )}
        {userSearchResults.length > 0 && (
          <div className="grid gap-3">
            {userSearchResults.map((result) => (
              <div key={result.id} className="bg-secondary/10 rounded-lg p-3 border border-white/5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={result.photoURL || undefined} alt={result.displayName} />
                    <AvatarFallback className="bg-accent/10 text-accent">
                      {result.displayName?.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <Link to={`/profilo/${result.id}`} className="font-semibold hover:text-accent">
                      {result.displayName}
                    </Link>
                    {result.bio && (
                      <div className="text-xs text-muted-foreground line-clamp-2">{result.bio}</div>
                    )}
                  </div>
                </div>
                <Button
                  variant={followedIds.has(result.id) ? "outline" : "default"}
                  onClick={() => onToggleFollow(result.id)}
                >
                  {followedIds.has(result.id) ? "Seguito" : "Segui"}
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
      <h2 className="text-xl font-semibold">Suggeriti</h2>
      {userId && (
        <Link to={`/profilo/${userId}/seguiti`} className="text-sm text-accent hover:underline">
          Gestisci i seguiti
        </Link>
      )}
      {suggestions.length === 0 && (
        <div className="text-muted-foreground">Nessun suggerimento disponibile.</div>
      )}
      {suggestions.map((suggestion) => (
        <div key={suggestion.id} className="bg-secondary/10 rounded-lg p-4 border border-white/5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={suggestion.photoURL || undefined} alt={suggestion.displayName} />
              <AvatarFallback className="bg-accent/10 text-accent">
                {suggestion.displayName?.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div>
              <Link to={`/profilo/${suggestion.id}`} className="font-semibold hover:text-accent">
                {suggestion.displayName}
              </Link>
              {suggestion.bio && (
                <div className="text-xs text-muted-foreground line-clamp-2">{suggestion.bio}</div>
              )}
            </div>
          </div>
          <Button
            variant={followedIds.has(suggestion.id) ? "outline" : "default"}
            onClick={() => onToggleFollow(suggestion.id)}
          >
            {followedIds.has(suggestion.id) ? "Seguito" : "Segui"}
          </Button>
        </div>
      ))}
    </div>
  );
};

export default CommunitySidebar;
