import { Button } from "@/components/ui/button";
import CommunityThoughtCard from "./CommunityThoughtCard";
import type { ThoughtComment, ThoughtItem, ThoughtVisibility } from "./types";

type CommunityThoughtListProps = {
  thoughts: ThoughtItem[];
  currentUserId?: string;
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
  likedThoughtIds: Set<string>;
  likesCount: Record<string, number>;
  commentsOpen: Set<string>;
  commentsByThought: Record<string, ThoughtComment[]>;
  commentInputs: Record<string, string>;
  onCommentInputChange: (thoughtId: string, value: string) => void;
  onSubmitComment: (thoughtId: string) => void;
  submittingCommentId: string | null;
  loadingComments: Set<string>;
  isSavingThought: boolean;
  hasMore: boolean;
  isLoadingMore: boolean;
  onLoadMore: () => void;
};

const CommunityThoughtList = ({
  thoughts,
  currentUserId,
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
  likedThoughtIds,
  likesCount,
  commentsOpen,
  commentsByThought,
  commentInputs,
  onCommentInputChange,
  onSubmitComment,
  submittingCommentId,
  loadingComments,
  isSavingThought,
  hasMore,
  isLoadingMore,
  onLoadMore
}: CommunityThoughtListProps) => {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Feed</h2>
      {thoughts.length === 0 && (
        <div className="text-muted-foreground">Nessun pensiero condiviso.</div>
      )}
      {thoughts.map((thought) => (
        <CommunityThoughtCard
          key={thought.id}
          thought={thought}
          isOwnThought={thought.userId === currentUserId}
          editingThoughtId={editingThoughtId}
          editingThoughtText={editingThoughtText}
          editingThoughtVisibility={editingThoughtVisibility}
          onEditThought={onEditThought}
          onSaveEdit={onSaveEdit}
          onCancelEdit={onCancelEdit}
          onDeleteThought={onDeleteThought}
          deletingThoughtId={deletingThoughtId}
          onEditTextChange={onEditTextChange}
          onEditVisibilityChange={onEditVisibilityChange}
          onToggleLike={onToggleLike}
          onToggleComments={onToggleComments}
          onShare={onShare}
          liked={likedThoughtIds.has(thought.id)}
          likeCount={likesCount[thought.id] || 0}
          commentsOpen={commentsOpen.has(thought.id)}
          comments={commentsByThought[thought.id] || []}
          commentInput={commentInputs[thought.id] || ""}
          onCommentInputChange={(value) => onCommentInputChange(thought.id, value)}
          onSubmitComment={() => onSubmitComment(thought.id)}
          submittingCommentId={submittingCommentId}
          loadingComments={loadingComments.has(thought.id)}
          isSavingThought={isSavingThought}
        />
      ))}
      {hasMore && (
        <div className="flex justify-center">
          <Button variant="outline" onClick={onLoadMore} disabled={isLoadingMore}>
            {isLoadingMore ? "Caricamento..." : "Carica altri"}
          </Button>
        </div>
      )}
    </div>
  );
};

export default CommunityThoughtList;
