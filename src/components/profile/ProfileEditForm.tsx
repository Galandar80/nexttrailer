import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type ProfileEditFormProps = {
  bioInput: string;
  genresInput: string;
  onBioChange: (value: string) => void;
  onGenresChange: (value: string) => void;
  onSave: () => void;
  isSaving: boolean;
};

const ProfileEditForm = ({
  bioInput,
  genresInput,
  onBioChange,
  onGenresChange,
  onSave,
  isSaving
}: ProfileEditFormProps) => {
  return (
    <div className="grid gap-4 bg-secondary/10 rounded-lg p-4 border border-white/5">
      <h2 className="text-lg font-semibold">Aggiorna profilo</h2>
      <Textarea
        value={bioInput}
        onChange={(event) => onBioChange(event.target.value)}
        placeholder="Descrivi il tuo stile cinematografico..."
      />
      <Input
        value={genresInput}
        onChange={(event) => onGenresChange(event.target.value)}
        placeholder="Generi preferiti separati da virgola"
      />
      <Button onClick={onSave} disabled={isSaving}>
        {isSaving ? "Salvataggio..." : "Salva profilo"}
      </Button>
    </div>
  );
};

export default ProfileEditForm;
