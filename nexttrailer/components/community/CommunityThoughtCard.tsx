import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import CommunityComments from "./CommunityComments";
import type { ThoughtComment, ThoughtItem, ThoughtVisibility } from "./types";

type CommunityThoughtCardProps = {
  thought: ThoughtItem;
  isOwnThought: boolean;
  editingThoughtId: string | null;
  editingThoughtText: string;
  editingThoughtVisibility: ThoughtVisibility;
  onEditThought: (thought: ThoughtItem) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onDeleteThought: (id: string) => void;
  deletingThoughtId: string | null;
  onEditTextChange: (value: string) => void;
  onEditVisibilityChange: (value: ThoughtVisibility) => void;
  onToggleLike: (thoughtId: string) => void;
  onToggleComments: (thoughtId: string) => void;
  onShare: (thought: ThoughtItem) => void;
  liked: boolean;
  likeCount: number;
  commentsOpen: boolean;
  comments: ThoughtComment[];
  commentInput: string;
  onCommentInputChange: (value: string) => void;
  onSubmitComment: () => void;
  submittingCommentId: string | null;
  loadingComments: boolean;
  isSavingThought: boolean;
};

const CommunityThoughtCard = ({
  thought,
  isOwnThought,
  editingThoughtId,
  editingThoughtText,
  editingThoughtVisibility,
  onEditThought,
  onSaveEdit,
  onCancelEdit,
  onDeleteThought,
  deletingThoughtId,
  onEditTextChange,
  onEditVisibilityChange,
  onToggleLike,
  onToggleComments,
  onShare,
  liked,
  likeCount,
  commentsOpen,
  comments,
  commentInput,
  onCommentInputChange,
  onSubmitComment,
  submittingCommentId,
  loadingComments,
  isSavingThought
}: CommunityThoughtCardProps) => {
  const isEditing = editingThoughtId === thought.id;
  return (
    <div className="bg-secondary/10 rounded-lg p-4 border border-white/5 space-y-2">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={thought.userPhoto || undefined} alt={thought.userName} />
            <AvatarFallback className="bg-accent/10 text-accent">
              {thought.userName?.charAt(0)}
            </AvatarFallback>
          </Avatar>
          <div>
            <Link href={`/profilo/${thought.userId}`} className="font-semibold hover:text-accent">
              {thought.userName}
            </Link>
            <div className="text-xs text-muted-foreground">
              {thought.visibility === "public" && "Pubblico"}
              {thought.visibility === "followers" && "Solo follower"}
              {thought.visibility === "private" && "Privato"}
            </div>
          </div>
        </div>
        {thought.createdAt && (
          <div className="text-xs text-muted-foreground">
            {thought.createdAt.toLocaleDateString("it-IT")}
          </div>
        )}
      </div>
      {isOwnThought && (
        <div className="flex flex-wrap gap-2">
          {isEditing ? (
            <>
              <Button variant="outline" size="sm" onClick={onSaveEdit} disabled={isSavingThought}>
                {isSavingThought ? "Salvataggio..." : "Salva"}
              </Button>
              <Button variant="ghost" size="sm" onClick={onCancelEdit} disabled={isSavingThought}>
                Annulla
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" size="sm" onClick={() => onEditThought(thought)}>
                Modifica
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDeleteThought(thought.id)}
                disabled={deletingThoughtId === thought.id}
              >
                {deletingThoughtId === thought.id ? "Eliminazione..." : "Elimina"}
              </Button>
            </>
          )}
        </div>
      )}
      {thought.sharedFromId && (
        <div className="bg-secondary/20 rounded-md p-3 space-y-1">
          <div className="text-xs text-muted-foreground">Condiviso da</div>
          <Link
            href={`/profilo/${thought.sharedFromUserId}`}
            className="text-sm font-semibold hover:text-accent"
          >
            {thought.sharedFromUserName || "Utente"}
          </Link>
          {thought.sharedFromTargetTitle && thought.sharedFromTargetType && thought.sharedFromTargetId ? (
            thought.sharedFromTargetType === "person" ? (
              <Link href={`/person/${thought.sharedFromTargetId}`} className="text-sm text-accent hover:underline">
                {thought.sharedFromTargetTitle}
              </Link>
            ) : (
              <Link href={`/${thought.sharedFromTargetType}/${thought.sharedFromTargetId}`} className="text-sm text-accent hover:underline">
                {thought.sharedFromTargetTitle}
              </Link>
            )
          ) : null}
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{thought.sharedFromText}</p>
        </div>
      )}
      {thought.targetTitle && thought.targetType && thought.targetId ? (
        thought.targetType === "person" ? (
          <Link href={`/person/${thought.targetId}`} className="text-sm text-accent hover:underline">
            {thought.targetTitle}
          </Link>
        ) : (
          <Link href={`/${thought.targetType}/${thought.targetId}`} className="text-sm text-accent hover:underline">
            {thought.targetTitle}
          </Link>
        )
      ) : null}
      {isEditing ? (
        <div className="space-y-2">
          <Textarea
            value={editingThoughtText}
            onChange={(event) => onEditTextChange(event.target.value)}
            className="min-h-[110px]"
          />
          <div className="max-w-[240px]">
            <Select value={editingThoughtVisibility} onValueChange={(value) => onEditVisibilityChange(value as ThoughtVisibility)}>
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
        </div>
      ) : (
        <p className="text-sm text-muted-foreground whitespace-pre-wrap">{thought.text}</p>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => onToggleLike(thought.id)}>
          {liked ? "Mi piace" : "Mi piace"} ({likeCount})
        </Button>
        <Button variant="ghost" size="sm" onClick={() => onToggleComments(thought.id)}>
          Commenta
        </Button>
        <Button variant="ghost" size="sm" onClick={() => onShare(thought)}>
          Condividi
        </Button>
      </div>
      {commentsOpen && (
        <CommunityComments
          thoughtId={thought.id}
          comments={comments}
          isLoading={loadingComments}
          inputValue={commentInput}
          onInputChange={onCommentInputChange}
          onSubmit={onSubmitComment}
          isSubmitting={submittingCommentId === thought.id}
        />
      )}
    </div>
  );
};

export default CommunityThoughtCard;
