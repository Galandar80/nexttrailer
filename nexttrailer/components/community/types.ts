export type ThoughtVisibility = "public" | "followers" | "private";
export type ThoughtTargetType = "none" | "movie" | "tv" | "person" | "content";
export type NotificationType = "follow" | "like" | "comment" | "share";

export type ThoughtItem = {
  id: string;
  createdAt?: Date | null;
  userId: string;
  userName: string;
  userPhoto?: string;
  text: string;
  visibility: ThoughtVisibility;
  targetId?: number | null;
  targetType?: "movie" | "tv" | "person" | null;
  targetTitle?: string;
  targetImage?: string;
  sharedFromId?: string | null;
  sharedFromUserId?: string | null;
  sharedFromUserName?: string;
  sharedFromText?: string;
  sharedFromTargetId?: number | null;
  sharedFromTargetType?: "movie" | "tv" | "person" | null;
  sharedFromTargetTitle?: string;
};

export type ProfileSummary = {
  id: string;
  displayName: string;
  photoURL?: string;
  bio?: string;
};

export type ThoughtTarget = {
  id: number;
  mediaType: "movie" | "tv" | "person";
  title: string;
  imagePath?: string | null;
};

export type ThoughtComment = {
  id: string;
  thoughtId: string;
  userId: string;
  userName: string;
  userPhoto?: string;
  text: string;
  createdAt?: Date | null;
};
