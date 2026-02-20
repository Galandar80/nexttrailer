import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/auth-core";
import { getDb, getFirestoreModule, isFirebaseEnabled } from "@/services/firebase";
import { SEO } from "@/components/SEO";
import ProfileHeader from "@/components/profile/ProfileHeader";
import ProfileEditForm from "@/components/profile/ProfileEditForm";
import ProfileActivityList from "@/components/profile/ProfileActivityList";
import ProfileListsPanel from "@/components/profile/ProfileListsPanel";
import type { ActivityItem, ThoughtItem, ThoughtVisibility, UserList, UserProfile } from "@/components/profile/types";

const loadFirestore = async () => {
  if (!isFirebaseEnabled) return null;
  const [db, firestore] = await Promise.all([getDb(), getFirestoreModule()]);
  if (!db) return null;
  return { db, ...firestore };
};

const parseTimestamp = (
  value?: { toDate?: () => Date } | string | Date | null
) => {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value === "string") return new Date(value);
  if (typeof value === "object" && "toDate" in value && typeof value.toDate === "function") {
    return value.toDate();
  }
  return null;
};

const ProfilePage = () => {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const { user, canAccess } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [thoughts, setThoughts] = useState<ThoughtItem[]>([]);
  const [lists, setLists] = useState<UserList[]>([]);
  const [bioInput, setBioInput] = useState("");
  const [genresInput, setGenresInput] = useState("");
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [newListName, setNewListName] = useState("");
  const [newListDescription, setNewListDescription] = useState("");
  const [isListPublic, setIsListPublic] = useState(true);
  const [isCreatingList, setIsCreatingList] = useState(false);
  const [editingListId, setEditingListId] = useState<string | null>(null);
  const [editingListName, setEditingListName] = useState("");
  const [editingListDescription, setEditingListDescription] = useState("");
  const [editingListIsPublic, setEditingListIsPublic] = useState(true);
  const [isSavingList, setIsSavingList] = useState(false);
  const [deletingListId, setDeletingListId] = useState<string | null>(null);
  const [editingThoughtId, setEditingThoughtId] = useState<string | null>(null);
  const [editingThoughtText, setEditingThoughtText] = useState("");
  const [editingThoughtVisibility, setEditingThoughtVisibility] = useState<ThoughtVisibility>("public");
  const [isSavingThought, setIsSavingThought] = useState(false);
  const [deletingThoughtId, setDeletingThoughtId] = useState<string | null>(null);
  const createNotification = async (
    firestore: Awaited<ReturnType<typeof loadFirestore>>,
    payload: { recipientId: string; type: "follow" | "like" | "comment" | "share" }
  ) => {
    if (!firestore || !user) return;
    if (!payload.recipientId || payload.recipientId === user.uid) return;
    const { db, addDoc, collection, serverTimestamp } = firestore;
    await addDoc(collection(db, "user_notifications"), {
      recipientId: payload.recipientId,
      actorId: user.uid,
      actorName: user.displayName || user.email || "Utente",
      actorPhoto: user.photoURL || "",
      type: payload.type,
      thoughtId: null,
      thoughtText: "",
      commentText: "",
      createdAt: serverTimestamp(),
      readAt: null
    });
  };

  const profileId = id || user?.uid || "";
  const isOwnProfile = Boolean(user?.uid && profileId === user.uid);

  useEffect(() => {
    if (!profileId) {
      setIsLoading(false);
      return;
    }
    const loadProfile = async () => {
      setIsLoading(true);
      const firestore = await loadFirestore();
      if (!firestore) {
        setIsLoading(false);
        return;
      }
      try {
        const { db, doc, getDoc, collection, getDocs, query, where, orderBy, limit } = firestore;
        const userRef = doc(db, "users", profileId);
        const snapshot = await getDoc(userRef);
        const data = snapshot.exists() ? snapshot.data() : {};
        const profileData = (data?.profile || {}) as Partial<UserProfile>;
        const displayName = profileData.displayName || data?.displayName || user?.displayName || "Utente";
        const bio = profileData.bio || "";
        const favoriteGenres = Array.isArray(profileData.favoriteGenres) ? profileData.favoriteGenres : [];
        const photoURL = profileData.photoURL || user?.photoURL || "";
        setProfile({ displayName, bio, favoriteGenres, photoURL });
        if (isOwnProfile) {
          setBioInput(bio);
          setGenresInput(favoriteGenres.join(", "));
        }

        const followersSnapshot = await getDocs(query(collection(db, "user_follows"), where("followedId", "==", profileId)));
        const followingSnapshot = await getDocs(query(collection(db, "user_follows"), where("followerId", "==", profileId)));
        setFollowersCount(followersSnapshot.size);
        setFollowingCount(followingSnapshot.size);

        let viewerIsFollowing = false;
        if (canAccess && user && !isOwnProfile) {
          const followRef = doc(db, "user_follows", `${user.uid}_${profileId}`);
          const followSnap = await getDoc(followRef);
          viewerIsFollowing = followSnap.exists();
          setIsFollowing(viewerIsFollowing);
        }

        let listSnapshot;
        try {
          if (isOwnProfile) {
            listSnapshot = await getDocs(query(collection(db, "user_lists"), where("ownerId", "==", profileId), orderBy("updatedAt", "desc")));
          } else {
            listSnapshot = await getDocs(query(collection(db, "user_lists"), where("ownerId", "==", profileId), where("isPublic", "==", true), orderBy("updatedAt", "desc")));
          }
        } catch {
          listSnapshot = await getDocs(query(collection(db, "user_lists"), where("ownerId", "==", profileId)));
        }
        const listItems = listSnapshot.docs.map((entry) => {
          const listData = entry.data() as Omit<UserList, "id" | "updatedAt"> & {
            updatedAt?: { toDate?: () => Date } | string | Date;
          };
          const updatedAt = parseTimestamp(listData.updatedAt);
          return {
            id: entry.id,
            ownerId: listData.ownerId,
            name: listData.name,
            description: listData.description || "",
            isPublic: Boolean(listData.isPublic),
            items: Array.isArray(listData.items) ? listData.items : [],
            updatedAt
          };
        });
        const filteredLists = isOwnProfile ? listItems : listItems.filter((entry) => entry.isPublic);
        setLists(filteredLists);

        let activitySnapshot;
        try {
          activitySnapshot = await getDocs(query(collection(db, "user_activity"), where("userId", "==", profileId), orderBy("createdAt", "desc"), limit(20)));
        } catch {
          activitySnapshot = await getDocs(query(collection(db, "user_activity"), where("userId", "==", profileId), limit(20)));
        }
        const activityItems = activitySnapshot.docs.map((entry) => {
          const activityData = entry.data() as Omit<ActivityItem, "id" | "createdAt"> & {
            createdAt?: { toDate?: () => Date } | string | Date;
          };
          const createdAt = parseTimestamp(activityData.createdAt);
          return {
            id: entry.id,
            type: activityData.type,
            createdAt,
            mediaId: activityData.mediaId,
            mediaType: activityData.mediaType,
            mediaTitle: activityData.mediaTitle || "",
            rating: activityData.rating ?? null,
            commentText: activityData.commentText || "",
            listName: activityData.listName || ""
          };
        });
        const sortedActivities = activityItems.sort((a, b) => {
          if (!a.createdAt && !b.createdAt) return 0;
          if (!a.createdAt) return 1;
          if (!b.createdAt) return -1;
          return b.createdAt.getTime() - a.createdAt.getTime();
        });
        setActivities(sortedActivities);

        let thoughtSnapshot;
        try {
          thoughtSnapshot = await getDocs(query(
            collection(db, "community_thoughts"),
            where("userId", "==", profileId),
            orderBy("createdAt", "desc"),
            limit(20)
          ));
        } catch {
          thoughtSnapshot = await getDocs(query(
            collection(db, "community_thoughts"),
            where("userId", "==", profileId),
            limit(20)
          ));
        }
        const thoughtItems = thoughtSnapshot.docs.map((entry) => {
          const thoughtData = entry.data() as Omit<ThoughtItem, "id" | "createdAt"> & {
            createdAt?: { toDate?: () => Date } | string | Date;
          };
          const createdAt = parseTimestamp(thoughtData.createdAt);
          return {
            id: entry.id,
            createdAt,
            userId: thoughtData.userId,
            text: thoughtData.text || "",
            visibility: (thoughtData.visibility || "public") as ThoughtVisibility,
            targetId: thoughtData.targetId ?? null,
            targetType: thoughtData.targetType ?? null,
            targetTitle: thoughtData.targetTitle || ""
          };
        });
        const visibleThoughts = thoughtItems.filter((item) => {
          if (isOwnProfile) return true;
          if (item.visibility === "public") return true;
          if (item.visibility === "followers" && viewerIsFollowing) return true;
          return false;
        });
        setThoughts(visibleThoughts);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Errore nel caricamento del profilo";
        toast({ title: message, variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    };
    void loadProfile();
  }, [profileId, canAccess, isOwnProfile, user, toast]);

  const handleToggleFollow = async () => {
    if (!canAccess || !user || isOwnProfile) {
      toast({ title: "Accedi per seguire", variant: "destructive" });
      return;
    }
    const firestore = await loadFirestore();
    if (!firestore) {
      toast({ title: "Firebase non configurato", variant: "destructive" });
      return;
    }
    try {
      const { db, doc, setDoc, deleteDoc, serverTimestamp } = firestore;
      const followRef = doc(db, "user_follows", `${user.uid}_${profileId}`);
      if (isFollowing) {
        await deleteDoc(followRef);
        setIsFollowing(false);
        setFollowersCount((prev) => Math.max(0, prev - 1));
      } else {
        await setDoc(followRef, {
          followerId: user.uid,
          followedId: profileId,
          createdAt: serverTimestamp()
        });
        setIsFollowing(true);
        setFollowersCount((prev) => prev + 1);
        await createNotification(firestore, { recipientId: profileId, type: "follow" });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Operazione non riuscita";
      toast({ title: message, variant: "destructive" });
    }
  };

  const handleSaveProfile = async () => {
    if (!canAccess || !user || !isOwnProfile) return;
    const firestore = await loadFirestore();
    if (!firestore) {
      toast({ title: "Firebase non configurato", variant: "destructive" });
      return;
    }
    setIsSavingProfile(true);
    try {
      const { db, doc, setDoc } = firestore;
      const genres = genresInput
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
      await setDoc(doc(db, "users", user.uid), {
        profile: {
          displayName: profile?.displayName || user.displayName || "Utente",
          bio: bioInput.trim(),
          favoriteGenres: genres,
          photoURL: user.photoURL || ""
        }
      }, { merge: true });
      setProfile((prev) => prev ? { ...prev, bio: bioInput.trim(), favoriteGenres: genres } : prev);
      toast({ title: "Profilo aggiornato" });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Aggiornamento non riuscito";
      toast({ title: message, variant: "destructive" });
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleCreateList = async () => {
    if (!canAccess || !user || !isOwnProfile) return;
    if (!newListName.trim()) {
      toast({ title: "Inserisci un nome per la lista", variant: "destructive" });
      return;
    }
    const firestore = await loadFirestore();
    if (!firestore) {
      toast({ title: "Firebase non configurato", variant: "destructive" });
      return;
    }
    setIsCreatingList(true);
    try {
      const { db, addDoc, collection, serverTimestamp } = firestore;
      await addDoc(collection(db, "user_lists"), {
        ownerId: user.uid,
        name: newListName.trim(),
        description: newListDescription.trim(),
        isPublic: isListPublic,
        items: [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      setNewListName("");
      setNewListDescription("");
      setIsListPublic(true);
      navigate(0);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Creazione lista non riuscita";
      toast({ title: message, variant: "destructive" });
    } finally {
      setIsCreatingList(false);
    }
  };

  const handleEditList = (list: UserList) => {
    setEditingListId(list.id);
    setEditingListName(list.name);
    setEditingListDescription(list.description || "");
    setEditingListIsPublic(list.isPublic);
  };

  const handleCancelListEdit = () => {
    setEditingListId(null);
    setEditingListName("");
    setEditingListDescription("");
    setEditingListIsPublic(true);
  };

  const handleSaveListEdit = async () => {
    if (!editingListId || !isOwnProfile) return;
    const trimmedName = editingListName.trim();
    if (!trimmedName) {
      toast({ title: "Inserisci un nome per la lista", variant: "destructive" });
      return;
    }
    const firestore = await loadFirestore();
    if (!firestore) {
      toast({ title: "Firebase non configurato", variant: "destructive" });
      return;
    }
    setIsSavingList(true);
    try {
      const { db, doc, updateDoc, serverTimestamp } = firestore;
      await updateDoc(doc(db, "user_lists", editingListId), {
        name: trimmedName,
        description: editingListDescription.trim(),
        isPublic: editingListIsPublic,
        updatedAt: serverTimestamp()
      });
      setLists((prev) =>
        prev.map((item) =>
          item.id === editingListId
            ? {
              ...item,
              name: trimmedName,
              description: editingListDescription.trim(),
              isPublic: editingListIsPublic,
              updatedAt: new Date()
            }
            : item
        )
      );
      handleCancelListEdit();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Modifica lista non riuscita";
      toast({ title: message, variant: "destructive" });
    } finally {
      setIsSavingList(false);
    }
  };

  const handleDeleteList = async (listId: string) => {
    if (!isOwnProfile) return;
    const confirmDelete = window.confirm("Vuoi eliminare questa lista?");
    if (!confirmDelete) return;
    const firestore = await loadFirestore();
    if (!firestore) {
      toast({ title: "Firebase non configurato", variant: "destructive" });
      return;
    }
    setDeletingListId(listId);
    try {
      const { db, doc, deleteDoc } = firestore;
      await deleteDoc(doc(db, "user_lists", listId));
      setLists((prev) => prev.filter((item) => item.id !== listId));
      if (editingListId === listId) {
        handleCancelListEdit();
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Eliminazione lista non riuscita";
      toast({ title: message, variant: "destructive" });
    } finally {
      setDeletingListId(null);
    }
  };

  const handleEditThought = (thought: ThoughtItem) => {
    setEditingThoughtId(thought.id);
    setEditingThoughtText(thought.text);
    setEditingThoughtVisibility(thought.visibility);
  };

  const handleCancelThoughtEdit = () => {
    setEditingThoughtId(null);
    setEditingThoughtText("");
    setEditingThoughtVisibility("public");
  };

  const handleSaveThoughtEdit = async () => {
    if (!editingThoughtId || !isOwnProfile) return;
    const trimmedText = editingThoughtText.trim();
    if (!trimmedText) {
      toast({ title: "Il pensiero non può essere vuoto", variant: "destructive" });
      return;
    }
    const firestore = await loadFirestore();
    if (!firestore) {
      toast({ title: "Firebase non configurato", variant: "destructive" });
      return;
    }
    setIsSavingThought(true);
    try {
      const { db, doc, updateDoc, serverTimestamp } = firestore;
      await updateDoc(doc(db, "community_thoughts", editingThoughtId), {
        text: trimmedText,
        visibility: editingThoughtVisibility,
        updatedAt: serverTimestamp()
      });
      setThoughts((prev) =>
        prev.map((item) =>
          item.id === editingThoughtId
            ? { ...item, text: trimmedText, visibility: editingThoughtVisibility }
            : item
        )
      );
      handleCancelThoughtEdit();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Modifica non riuscita";
      toast({ title: message, variant: "destructive" });
    } finally {
      setIsSavingThought(false);
    }
  };

  const handleDeleteThought = async (thoughtId: string) => {
    if (!isOwnProfile) return;
    const firestore = await loadFirestore();
    if (!firestore) {
      toast({ title: "Firebase non configurato", variant: "destructive" });
      return;
    }
    setDeletingThoughtId(thoughtId);
    try {
      const { db, doc, deleteDoc } = firestore;
      await deleteDoc(doc(db, "community_thoughts", thoughtId));
      setThoughts((prev) => prev.filter((item) => item.id !== thoughtId));
      if (editingThoughtId === thoughtId) {
        handleCancelThoughtEdit();
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Eliminazione non riuscita";
      toast({ title: message, variant: "destructive" });
    } finally {
      setDeletingThoughtId(null);
    }
  };

  const formatActivity = (item: ActivityItem) => {
    if (item.type === "rating") {
      return `ha votato ${item.rating || "—"}`;
    }
    if (item.type === "comment") {
      return "ha commentato";
    }
    if (item.type === "list_add") {
      return item.listName ? `ha aggiunto a ${item.listName}` : "ha aggiunto a una lista";
    }
    return "ha aggiornato";
  };

  const seoTitle = profile?.displayName ? `Profilo di ${profile.displayName}` : "Profilo";
  const seoDescription = profile?.bio || "Profilo utente NextTrailer";
  const recentItems = [
    ...activities.map((activity) => ({ kind: "activity" as const, createdAt: activity.createdAt, activity })),
    ...thoughts.map((thought) => ({ kind: "thought" as const, createdAt: thought.createdAt, thought }))
  ].sort((a, b) => {
    const aTime = a.createdAt ? a.createdAt.getTime() : 0;
    const bTime = b.createdAt ? b.createdAt.getTime() : 0;
    return bTime - aTime;
  });

  if (!profileId) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <Navbar />
        <main className="max-w-screen-lg mx-auto px-4 py-12">
          <div className="text-center text-muted-foreground">Accedi per vedere il profilo.</div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SEO title={seoTitle} description={seoDescription} />
      <Navbar />
      <main className="max-w-screen-xl mx-auto px-4 md:px-8 py-8">
        {isLoading && (
          <div className="h-[50vh] flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent"></div>
          </div>
        )}

        {!isLoading && profile && (
          <div className="space-y-8">
            <ProfileHeader
              profile={profile}
              profileId={profileId}
              isOwnProfile={isOwnProfile}
              isFollowing={isFollowing}
              followersCount={followersCount}
              followingCount={followingCount}
              listsCount={lists.length}
              onToggleFollow={handleToggleFollow}
              onOpenPreferences={() => navigate("/preferenze")}
            />

            {isOwnProfile && (
              <ProfileEditForm
                bioInput={bioInput}
                genresInput={genresInput}
                onBioChange={setBioInput}
                onGenresChange={setGenresInput}
                onSave={handleSaveProfile}
                isSaving={isSavingProfile}
              />
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <ProfileActivityList
                recentItems={recentItems}
                isOwnProfile={isOwnProfile}
                editingThoughtId={editingThoughtId}
                editingThoughtText={editingThoughtText}
                editingThoughtVisibility={editingThoughtVisibility}
                onEditThought={handleEditThought}
                onSaveThoughtEdit={handleSaveThoughtEdit}
                onCancelThoughtEdit={handleCancelThoughtEdit}
                onDeleteThought={handleDeleteThought}
                deletingThoughtId={deletingThoughtId}
                isSavingThought={isSavingThought}
                onEditTextChange={setEditingThoughtText}
                onEditVisibilityChange={setEditingThoughtVisibility}
                formatActivity={formatActivity}
              />
              <ProfileListsPanel
                lists={lists}
                isOwnProfile={isOwnProfile}
                newListName={newListName}
                newListDescription={newListDescription}
                isListPublic={isListPublic}
                onNewListNameChange={setNewListName}
                onNewListDescriptionChange={setNewListDescription}
                onListPublicChange={setIsListPublic}
                onCreateList={handleCreateList}
                isCreatingList={isCreatingList}
                editingListId={editingListId}
                editingListName={editingListName}
                editingListDescription={editingListDescription}
                editingListIsPublic={editingListIsPublic}
                onEditingListNameChange={setEditingListName}
                onEditingListDescriptionChange={setEditingListDescription}
                onEditingListIsPublicChange={setEditingListIsPublic}
                onEditList={handleEditList}
                onSaveListEdit={handleSaveListEdit}
                onCancelListEdit={handleCancelListEdit}
                onDeleteList={handleDeleteList}
                deletingListId={deletingListId}
                isSavingList={isSavingList}
              />
            </div>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default ProfilePage;
