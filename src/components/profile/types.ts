export type UserProfile = {
  displayName: string;
  bio: string;
  favoriteGenres: string[];
  photoURL: string;
};

export type ActivityItem = {
  id: string;
  type: "rating" | "comment" | "list_add";
  createdAt?: Date | null;
  mediaId: number;
  mediaType: "movie" | "tv";
  mediaTitle: string;
  rating?: number | null;
  commentText?: string;
  listName?: string;
};

export type ThoughtVisibility = "public" | "followers" | "private";

export type ThoughtItem = {
  id: string;
  createdAt?: Date | null;
  userId: string;
  text: string;
  visibility: ThoughtVisibility;
  targetId?: number | null;
  targetType?: "movie" | "tv" | "person" | null;
  targetTitle?: string;
};

export type UserListItem = {
  mediaId: number;
  mediaType: "movie" | "tv";
  title: string;
  posterPath?: string | null;
};

export type UserList = {
  id: string;
  ownerId: string;
  name: string;
  description?: string;
  isPublic: boolean;
  items: UserListItem[];
  updatedAt?: Date | null;
};
