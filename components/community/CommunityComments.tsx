import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ThoughtComment } from "./types";

type CommunityCommentsProps = {
  thoughtId: string;
  comments: ThoughtComment[];
  isLoading: boolean;
  inputValue: string;
  onInputChange: (value: string) => void;
  onSubmit: () => void;
  isSubmitting: boolean;
};

const CommunityComments = ({
  comments,
  isLoading,
  inputValue,
  onInputChange,
  onSubmit,
  isSubmitting
}: CommunityCommentsProps) => {
  return (
    <div className="space-y-3 border-t border-white/10 pt-3">
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          value={inputValue}
          onChange={(event) => onInputChange(event.target.value)}
          placeholder="Scrivi un commento..."
        />
        <Button
          variant="outline"
          onClick={onSubmit}
          disabled={isSubmitting}
        >
          {isSubmitting ? "Invio..." : "Invia"}
        </Button>
      </div>
      {isLoading && (
        <div className="text-xs text-muted-foreground">Caricamento commenti...</div>
      )}
      {comments.length === 0 && !isLoading && (
        <div className="text-xs text-muted-foreground">Nessun commento.</div>
      )}
      {comments.map((comment) => (
        <div key={comment.id} className="flex items-start gap-3">
          <Avatar className="h-8 w-8">
            <AvatarImage src={comment.userPhoto || undefined} alt={comment.userName} />
            <AvatarFallback className="bg-accent/10 text-accent">
              {comment.userName?.charAt(0)}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="text-sm font-semibold">{comment.userName}</div>
            <div className="text-sm text-muted-foreground whitespace-pre-wrap">{comment.text}</div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default CommunityComments;
