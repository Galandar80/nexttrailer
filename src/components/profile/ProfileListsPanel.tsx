import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { OptimizedImage } from "@/components/OptimizedImage";
import { tmdbApi } from "@/services/tmdbApi";
import type { UserList } from "./types";

type ProfileListsPanelProps = {
  lists: UserList[];
  isOwnProfile: boolean;
  newListName: string;
  newListDescription: string;
  isListPublic: boolean;
  onNewListNameChange: (value: string) => void;
  onNewListDescriptionChange: (value: string) => void;
  onListPublicChange: (value: boolean) => void;
  onCreateList: () => void;
  isCreatingList: boolean;
  editingListId: string | null;
  editingListName: string;
  editingListDescription: string;
  editingListIsPublic: boolean;
  onEditingListNameChange: (value: string) => void;
  onEditingListDescriptionChange: (value: string) => void;
  onEditingListIsPublicChange: (value: boolean) => void;
  onEditList: (list: UserList) => void;
  onSaveListEdit: () => void;
  onCancelListEdit: () => void;
  onDeleteList: (id: string) => void;
  deletingListId: string | null;
  isSavingList: boolean;
};

const ProfileListsPanel = ({
  lists,
  isOwnProfile,
  newListName,
  newListDescription,
  isListPublic,
  onNewListNameChange,
  onNewListDescriptionChange,
  onListPublicChange,
  onCreateList,
  isCreatingList,
  editingListId,
  editingListName,
  editingListDescription,
  editingListIsPublic,
  onEditingListNameChange,
  onEditingListDescriptionChange,
  onEditingListIsPublicChange,
  onEditList,
  onSaveListEdit,
  onCancelListEdit,
  onDeleteList,
  deletingListId,
  isSavingList
}: ProfileListsPanelProps) => {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Liste</h2>
      {isOwnProfile && (
        <div className="bg-secondary/10 rounded-lg p-4 border border-white/5 space-y-3">
          <Input
            value={newListName}
            onChange={(event) => onNewListNameChange(event.target.value)}
            placeholder="Nome lista"
          />
          <Textarea
            value={newListDescription}
            onChange={(event) => onNewListDescriptionChange(event.target.value)}
            placeholder="Descrizione (opzionale)"
            rows={2}
          />
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <input
              type="checkbox"
              checked={isListPublic}
              onChange={(event) => onListPublicChange(event.target.checked)}
            />
            Lista pubblica
          </label>
          <Button onClick={onCreateList} disabled={isCreatingList}>
            {isCreatingList ? "Creazione..." : "Crea lista"}
          </Button>
        </div>
      )}
      {lists.length === 0 && (
        <div className="text-muted-foreground">Nessuna lista disponibile.</div>
      )}
      {lists.map((list) => (
        <div key={list.id} className="bg-secondary/10 rounded-lg p-4 border border-white/5 space-y-3">
          <div className="flex items-center justify-between gap-2">
            {editingListId === list.id ? (
              <div className="w-full space-y-2">
                <Input
                  value={editingListName}
                  onChange={(event) => onEditingListNameChange(event.target.value)}
                  placeholder="Nome lista"
                />
                <Textarea
                  value={editingListDescription}
                  onChange={(event) => onEditingListDescriptionChange(event.target.value)}
                  placeholder="Descrizione (opzionale)"
                  rows={2}
                />
                <label className="flex items-center gap-2 text-sm text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={editingListIsPublic}
                    onChange={(event) => onEditingListIsPublicChange(event.target.checked)}
                  />
                  Lista pubblica
                </label>
                <div className="flex gap-2">
                  <Button onClick={onSaveListEdit} disabled={isSavingList}>
                    {isSavingList ? "Salvataggio..." : "Salva"}
                  </Button>
                  <Button variant="ghost" onClick={onCancelListEdit} disabled={isSavingList}>
                    Annulla
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <div>
                  <h3 className="text-lg font-semibold">{list.name}</h3>
                  {list.description && <p className="text-sm text-muted-foreground">{list.description}</p>}
                </div>
                <div className="flex items-center gap-2">
                  {!list.isPublic && isOwnProfile && (
                    <span className="text-xs text-muted-foreground">Privata</span>
                  )}
                  {isOwnProfile && (
                    <>
                      <Button variant="outline" size="sm" onClick={() => onEditList(list)}>
                        Modifica
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onDeleteList(list.id)}
                        disabled={deletingListId === list.id}
                      >
                        {deletingListId === list.id ? "Elimino..." : "Elimina"}
                      </Button>
                    </>
                  )}
                </div>
              </>
            )}
          </div>
          {list.items.length === 0 && editingListId !== list.id && (
            <div className="text-sm text-muted-foreground">Lista vuota</div>
          )}
          {list.items.length > 0 && editingListId !== list.id && (
            <div className="grid grid-cols-4 gap-2">
              {list.items.slice(0, 8).map((item) => (
                <Link key={`${item.mediaType}-${item.mediaId}`} to={`/${item.mediaType}/${item.mediaId}`}>
                  <div className="rounded-md overflow-hidden border border-white/10">
                    {item.posterPath ? (
                      <OptimizedImage
                        src={tmdbApi.getImageUrl(item.posterPath, "w342")}
                        alt={item.title}
                        className="w-full aspect-[2/3] object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full aspect-[2/3] bg-secondary/30 flex items-center justify-center text-xs text-muted-foreground">
                        Nessuna immagine
                      </div>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default ProfileListsPanel;
