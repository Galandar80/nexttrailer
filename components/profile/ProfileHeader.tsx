import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import type { UserProfile } from "./types";

type ProfileHeaderProps = {
  profile: UserProfile;
  profileId: string;
  isOwnProfile: boolean;
  isFollowing: boolean;
  followersCount: number;
  followingCount: number;
  listsCount: number;
  onToggleFollow: () => void;
  onOpenPreferences: () => void;
};

const ProfileHeader = ({
  profile,
  profileId,
  isOwnProfile,
  isFollowing,
  followersCount,
  followingCount,
  listsCount,
  onToggleFollow,
  onOpenPreferences
}: ProfileHeaderProps) => {
  return (
    <div className="flex flex-col lg:flex-row gap-6 items-start">
      <Avatar className="h-24 w-24 border border-border">
        <AvatarImage src={profile.photoURL || undefined} alt={profile.displayName} />
        <AvatarFallback className="bg-accent/10 text-accent text-2xl">
          {profile.displayName?.charAt(0)}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 space-y-3">
        <div className="flex flex-wrap items-center gap-4">
          <h1 className="text-3xl font-bold">{profile.displayName}</h1>
          {!isOwnProfile && (
            <Button onClick={onToggleFollow}>
              {isFollowing ? "Seguito" : "Segui"}
            </Button>
          )}
          {isOwnProfile && (
            <Button variant="outline" onClick={onOpenPreferences}>
              Preferenze
            </Button>
          )}
        </div>
        {profile.bio && <p className="text-muted-foreground">{profile.bio}</p>}
        {profile.favoriteGenres.length > 0 && (
          <div className="text-sm text-muted-foreground">
            Generi preferiti: {profile.favoriteGenres.join(", ")}
          </div>
        )}
        <div className="flex flex-wrap gap-6 text-sm text-muted-foreground">
          <Link href={`/profilo/${profileId}/follower`} className="hover:text-accent">
            <span className="font-semibold text-white">{followersCount}</span> follower
          </Link>
          <Link href={`/profilo/${profileId}/seguiti`} className="hover:text-accent">
            <span className="font-semibold text-white">{followingCount}</span> seguiti
          </Link>
          <div><span className="font-semibold text-white">{listsCount}</span> liste</div>
        </div>
      </div>
    </div>
  );
};

export default ProfileHeader;
