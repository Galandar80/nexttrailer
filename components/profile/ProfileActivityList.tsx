import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { ActivityItem, ThoughtItem, ThoughtVisibility } from "./types";

type RecentItem =
  | { kind: "activity"; createdAt?: Date | null; activity: ActivityItem }
  | { kind: "thought"; createdAt?: Date | null; thought: ThoughtItem };

type ProfileActivityListProps = {
  recentItems: RecentItem[];
  isOwnProfile: boolean;
  editingThoughtId: string | null;
  editingThoughtText: string;
  editingThoughtVisibility: ThoughtVisibility;
  onEditThought: (thought: ThoughtItem) => void;
  onSaveThoughtEdit: () => void;
  onCancelThoughtEdit: () => void;
  onDeleteThought: (id: string) => void;
  deletingThoughtId: string | null;
  isSavingThought: boolean;
  onEditTextChange: (value: string) => void;
  onEditVisibilityChange: (value: ThoughtVisibility) => void;
  formatActivity: (item: ActivityItem) => string;
};

const ProfileActivityList = ({
  recentItems,
  isOwnProfile,
  editingThoughtId,
  editingThoughtText,
  editingThoughtVisibility,
  onEditThought,
  onSaveThoughtEdit,
  onCancelThoughtEdit,
  onDeleteThought,
  deletingThoughtId,
  isSavingThought,
  onEditTextChange,
  onEditVisibilityChange,
  formatActivity
}: ProfileActivityListProps) => {
  return (
    <div className="lg:col-span-2 space-y-4">
      <h2 className="text-xl font-semibold">Attività recente</h2>
      {recentItems.length === 0 && (
        <div className="text-muted-foreground">Nessuna attività recente.</div>
      )}
      {recentItems.map((item) => {
        if (item.kind === "activity") {
          const activity = item.activity;
          return (
            <div key={`activity-${activity.id}`} className="bg-secondary/10 rounded-lg p-4 border border-white/5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-sm text-muted-foreground">
                  {formatActivity(activity)}
                </div>
                {activity.createdAt && (
                  <div className="text-xs text-muted-foreground">
                    {activity.createdAt.toLocaleDateString("it-IT")}
                  </div>
                )}
              </div>
              <Link href={`/${activity.mediaType}/${activity.mediaId}`} className="text-lg font-semibold hover:text-accent">
                {activity.mediaTitle || "Titolo"}
              </Link>
              {activity.type === "comment" && activity.commentText && (
                <p className="text-sm text-muted-foreground mt-2">{activity.commentText}</p>
              )}
            </div>
          );
        }
        const thought = item.thought;
        return (
          <div key={`thought-${thought.id}`} className="bg-secondary/10 rounded-lg p-4 border border-white/5 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-sm text-muted-foreground">
                Pensiero condiviso · {thought.visibility === "public" && "Pubblico"}
                {thought.visibility === "followers" && "Solo follower"}
                {thought.visibility === "private" && "Privato"}
              </div>
              {thought.createdAt && (
                <div className="text-xs text-muted-foreground">
                  {thought.createdAt.toLocaleDateString("it-IT")}
                </div>
              )}
            </div>
            {isOwnProfile && (
              <div className="flex flex-wrap gap-2">
                {editingThoughtId === thought.id ? (
                  <>
                    <Button variant="outline" size="sm" onClick={onSaveThoughtEdit} disabled={isSavingThought}>
                      {isSavingThought ? "Salvataggio..." : "Salva"}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={onCancelThoughtEdit} disabled={isSavingThought}>
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
            {editingThoughtId === thought.id ? (
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
          </div>
        );
      })}
    </div>
  );
};

export default ProfileActivityList;
