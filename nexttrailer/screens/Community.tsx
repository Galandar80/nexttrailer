"use client";

import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useAuth } from "@/context/auth-core";
import { getDb, getFirestoreModule, isFirebaseEnabled } from "@/services/firebase";
import { useToast } from "@/hooks/use-toast";
import { SEO } from "@/components/SEO";
import { MediaItem, tmdbApi } from "@/services/tmdbApi";
import CommunityComposer from "@/components/community/CommunityComposer";
import CommunityThoughtList from "@/components/community/CommunityThoughtList";
import CommunitySidebar from "@/components/community/CommunitySidebar";
import type {
  NotificationType,
  ProfileSummary,
  ThoughtComment,
  ThoughtItem,
  ThoughtTarget,
  ThoughtTargetType,
  ThoughtVisibility
} from "@/components/community/types";
import type { QueryDocumentSnapshot } from "firebase/firestore";

const PAGE_SIZE = 20;

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

const mapThoughtDocs = (docs: QueryDocumentSnapshot[]) =>
  docs.map((entry) => {
    const data = entry.data() as Omit<ThoughtItem, "id" | "createdAt"> & {
      createdAt?: { toDate?: () => Date } | string | Date;
    };
    const createdAt = parseTimestamp(data.createdAt);
    return {
      id: entry.id,
      createdAt,
      userId: data.userId,
      userName: data.userName || "Utente",
      userPhoto: data.userPhoto || "",
      text: data.text || "",
      visibility: (data.visibility || "public") as ThoughtVisibility,
      targetId: data.targetId ?? null,
      targetType: data.targetType ?? null,
      targetTitle: data.targetTitle || "",
      targetImage: data.targetImage || "",
      sharedFromId: data.sharedFromId ?? null,
      sharedFromUserId: data.sharedFromUserId ?? null,
      sharedFromUserName: data.sharedFromUserName || "",
      sharedFromText: data.sharedFromText || "",
      sharedFromTargetId: data.sharedFromTargetId ?? null,
      sharedFromTargetType: data.sharedFromTargetType ?? null,
      sharedFromTargetTitle: data.sharedFromTargetTitle || ""
    } satisfies ThoughtItem;
  });

const CommunityPage = () => {
  const { user, canAccess } = useAuth();
  const { toast } = useToast();
  const [thoughts, setThoughts] = useState<ThoughtItem[]>([]);
  const [suggestions, setSuggestions] = useState<ProfileSummary[]>([]);
  const [followedIds, setFollowedIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [thoughtText, setThoughtText] = useState("");
  const [thoughtVisibility, setThoughtVisibility] = useState<ThoughtVisibility>("public");
  const [isPosting, setIsPosting] = useState(false);
  const [targetType, setTargetType] = useState<ThoughtTargetType>("none");
  const [targetQuery, setTargetQuery] = useState("");
  const [targetResults, setTargetResults] = useState<MediaItem[]>([]);
  const [isSearchingTarget, setIsSearchingTarget] = useState(false);
  const [selectedTarget, setSelectedTarget] = useState<ThoughtTarget | null>(null);
  const [editingThoughtId, setEditingThoughtId] = useState<string | null>(null);
  const [editingThoughtText, setEditingThoughtText] = useState("");
  const [editingThoughtVisibility, setEditingThoughtVisibility] = useState<ThoughtVisibility>("public");
  const [isSavingThought, setIsSavingThought] = useState(false);
  const [deletingThoughtId, setDeletingThoughtId] = useState<string | null>(null);
  const [likesCount, setLikesCount] = useState<Record<string, number>>({});
  const [likedThoughtIds, setLikedThoughtIds] = useState<Set<string>>(new Set());
  const [commentsByThought, setCommentsByThought] = useState<Record<string, ThoughtComment[]>>({});
  const [commentsOpen, setCommentsOpen] = useState<Set<string>>(new Set());
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [loadingComments, setLoadingComments] = useState<Set<string>>(new Set());
  const [submittingCommentId, setSubmittingCommentId] = useState<string | null>(null);
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [userSearchResults, setUserSearchResults] = useState<ProfileSummary[]>([]);
  const [isSearchingUsers, setIsSearchingUsers] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [lastThoughtDoc, setLastThoughtDoc] = useState<QueryDocumentSnapshot | null>(null);
  const createNotification = async (
    firestore: Awaited<ReturnType<typeof loadFirestore>>,
    payload: {
      recipientId: string;
      type: NotificationType;
      thoughtId?: string | null;
      thoughtText?: string;
      commentText?: string;
    }
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
      thoughtId: payload.thoughtId || null,
      thoughtText: payload.thoughtText || "",
      commentText: payload.commentText || "",
      createdAt: serverTimestamp(),
      readAt: null
    });
  };

  useEffect(() => {
    if (!canAccess || !user) {
      setIsLoading(false);
      return;
    }
    const loadCommunity = async () => {
      setIsLoading(true);
      setError(null);
      const firestore = await loadFirestore();
      if (!firestore) {
        setError("Firebase non configurato");
        setIsLoading(false);
        return;
      }
      try {
        const { db, collection, getDocs, query, where, orderBy, limit, doc, getDoc } = firestore;
        const followSnapshot = await getDocs(query(collection(db, "user_follows"), where("followerId", "==", user.uid)));
        const followed = followSnapshot.docs.map((entry) => entry.data()?.followedId).filter(Boolean) as string[];
        const followedSet = new Set(followed);
        setFollowedIds(followedSet);

        let thoughtSnapshot;
        try {
          thoughtSnapshot = await getDocs(query(
            collection(db, "community_thoughts"),
            orderBy("createdAt", "desc"),
            limit(PAGE_SIZE)
          ));
        } catch {
          thoughtSnapshot = await getDocs(query(
            collection(db, "community_thoughts"),
            limit(PAGE_SIZE)
          ));
        }
        const thoughtItems = mapThoughtDocs(thoughtSnapshot.docs);
        const visibleThoughts = thoughtItems.filter((item) => {
          if (item.userId === user.uid) return true;
          if (item.visibility === "public") return true;
          if (item.visibility === "followers" && followedSet.has(item.userId)) return true;
          return false;
        });
        const sortedThoughts = visibleThoughts.sort((a, b) => {
          if (!a.createdAt && !b.createdAt) return 0;
          if (!a.createdAt) return 1;
          if (!b.createdAt) return -1;
          return b.createdAt.getTime() - a.createdAt.getTime();
        });
        setThoughts(sortedThoughts);
        setLastThoughtDoc(thoughtSnapshot.docs[thoughtSnapshot.docs.length - 1] || null);
        setHasMore(thoughtSnapshot.docs.length === PAGE_SIZE);

        const likeCounts: Record<string, number> = {};
        const likedIds = new Set<string>();
        await Promise.all(sortedThoughts.map(async (item) => {
          try {
            const likeSnapshot = await getDocs(query(
              collection(db, "community_thought_likes"),
              where("thoughtId", "==", item.id)
            ));
            likeCounts[item.id] = likeSnapshot.size;
            if (user) {
              const likeDoc = await getDoc(doc(db, "community_thought_likes", `${item.id}_${user.uid}`));
              if (likeDoc.exists()) {
                likedIds.add(item.id);
              }
            }
          } catch {
            likeCounts[item.id] = likeCounts[item.id] ?? 0;
          }
        }));
        setLikesCount(likeCounts);
        setLikedThoughtIds(likedIds);

        let recentActivity;
        try {
          recentActivity = await getDocs(query(collection(db, "community_thoughts"), orderBy("createdAt", "desc"), limit(30)));
        } catch {
          recentActivity = await getDocs(query(collection(db, "community_thoughts"), limit(30)));
        }
        const candidateIds = new Set<string>();
        recentActivity.docs.forEach((entry) => {
          const data = entry.data() as { userId?: string; visibility?: ThoughtVisibility };
          if (!data.userId) return;
          if (data.visibility === "private") return;
          if (data.userId === user.uid) return;
          if (followedSet.has(data.userId)) return;
          candidateIds.add(data.userId);
        });
        const suggestionsList = await Promise.all(Array.from(candidateIds).slice(0, 6).map(async (candidateId) => {
          const userDoc = await getDoc(doc(db, "users", candidateId));
          const data = userDoc.exists() ? userDoc.data() : {};
          const profile = (data?.profile || {}) as Partial<ProfileSummary>;
          return {
            id: candidateId,
            displayName: profile.displayName || data?.displayName || "Utente",
            photoURL: profile.photoURL || "",
            bio: profile.bio || ""
          };
        }));
        setSuggestions(suggestionsList);
      } catch (error) {
        console.error("Errore community:", error);
        setError("Errore nel caricamento della community");
      } finally {
        setIsLoading(false);
      }
    };
    void loadCommunity();
  }, [canAccess, user]);

  useEffect(() => {
    if (!userSearchQuery.trim()) {
      setUserSearchResults([]);
    }
  }, [userSearchQuery]);

  const handleSearchUsers = async () => {
    if (!canAccess || !user) {
      toast({ title: "Accedi per cercare utenti", variant: "destructive" });
      return;
    }
    const queryText = userSearchQuery.trim().toLowerCase();
    if (!queryText) {
      setUserSearchResults([]);
      return;
    }
    const firestore = await loadFirestore();
    if (!firestore) {
      toast({ title: "Firebase non configurato", variant: "destructive" });
      return;
    }
    setIsSearchingUsers(true);
    try {
      const { db, collection, getDocs, limit, query } = firestore;
      const snapshot = await getDocs(query(collection(db, "users"), limit(60)));
      const results = snapshot.docs.map((entry) => {
        const data = entry.data() as { displayName?: string; profile?: { displayName?: string; photoURL?: string; bio?: string } };
        const profile = data.profile || {};
        return {
          id: entry.id,
          displayName: profile.displayName || data.displayName || "Utente",
          photoURL: profile.photoURL || "",
          bio: profile.bio || ""
        };
      }).filter((profile) => {
        if (profile.id === user.uid) return false;
        const name = profile.displayName.toLowerCase();
        const bio = (profile.bio || "").toLowerCase();
        return name.includes(queryText) || bio.includes(queryText);
      });
      setUserSearchResults(results.slice(0, 10));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Ricerca utenti non riuscita";
      toast({ title: message, variant: "destructive" });
    } finally {
      setIsSearchingUsers(false);
    }
  };

  const handleToggleFollow = async (targetId: string) => {
    if (!canAccess || !user) {
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
      const followRef = doc(db, "user_follows", `${user.uid}_${targetId}`);
      if (followedIds.has(targetId)) {
        await deleteDoc(followRef);
        setFollowedIds((prev) => {
          const next = new Set(prev);
          next.delete(targetId);
          return next;
        });
      } else {
        await setDoc(followRef, {
          followerId: user.uid,
          followedId: targetId,
          createdAt: serverTimestamp()
        });
        setFollowedIds((prev) => new Set(prev).add(targetId));
        await createNotification(firestore, {
          recipientId: targetId,
          type: "follow"
        });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Operazione non riuscita";
      toast({ title: message, variant: "destructive" });
    }
  };

  const handleShareThought = async () => {
    if (!canAccess || !user) {
      toast({ title: "Accedi per condividere", variant: "destructive" });
      return;
    }
    const trimmedText = thoughtText.trim();
    if (!trimmedText) {
      toast({ title: "Scrivi un pensiero prima di condividere", variant: "destructive" });
      return;
    }
    const firestore = await loadFirestore();
    if (!firestore) {
      toast({ title: "Firebase non configurato", variant: "destructive" });
      return;
    }
    setIsPosting(true);
    try {
      const { db, addDoc, collection, serverTimestamp } = firestore;
      const targetPayload = selectedTarget
        ? {
            targetId: selectedTarget.id,
            targetType: selectedTarget.mediaType,
            targetTitle: selectedTarget.title,
            targetImage: selectedTarget.imagePath || ""
          }
        : {
            targetId: null,
            targetType: null,
            targetTitle: "",
            targetImage: ""
          };
      const payload = {
        userId: user.uid,
        userName: user.displayName || user.email || "Utente",
        userPhoto: user.photoURL || "",
        text: trimmedText,
        visibility: thoughtVisibility,
        ...targetPayload,
        createdAt: serverTimestamp()
      };
      const docRef = await addDoc(collection(db, "community_thoughts"), payload);
      const newThought: ThoughtItem = {
        id: docRef.id,
        userId: payload.userId,
        userName: payload.userName,
        userPhoto: payload.userPhoto,
        text: payload.text,
        visibility: payload.visibility,
        targetId: payload.targetId,
        targetType: payload.targetType,
        targetTitle: payload.targetTitle,
        targetImage: payload.targetImage,
        createdAt: new Date()
      };
      setThoughts((prev) => [newThought, ...prev]);
      setThoughtText("");
      setThoughtVisibility("public");
      setTargetType("none");
      setTargetQuery("");
      setTargetResults([]);
      setSelectedTarget(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Condivisione non riuscita";
      toast({ title: message, variant: "destructive" });
    } finally {
      setIsPosting(false);
    }
  };

  const handleToggleLike = async (thoughtId: string) => {
    if (!canAccess || !user) {
      toast({ title: "Accedi per mettere like", variant: "destructive" });
      return;
    }
    const firestore = await loadFirestore();
    if (!firestore) {
      toast({ title: "Firebase non configurato", variant: "destructive" });
      return;
    }
    const wasLiked = likedThoughtIds.has(thoughtId);
    const previousCount = likesCount[thoughtId] || 0;
    setLikedThoughtIds((prev) => {
      const next = new Set(prev);
      if (wasLiked) {
        next.delete(thoughtId);
      } else {
        next.add(thoughtId);
      }
      return next;
    });
    setLikesCount((prev) => ({
      ...prev,
      [thoughtId]: Math.max(0, previousCount + (wasLiked ? -1 : 1))
    }));
    try {
      const { db, doc, setDoc, deleteDoc, serverTimestamp } = firestore;
      const likeRef = doc(db, "community_thought_likes", `${thoughtId}_${user.uid}`);
      if (wasLiked) {
        await deleteDoc(likeRef);
      } else {
        await setDoc(likeRef, {
          thoughtId,
          userId: user.uid,
          createdAt: serverTimestamp()
        });
        const targetThought = thoughts.find((item) => item.id === thoughtId);
        if (targetThought?.userId && targetThought.userId !== user.uid) {
          await createNotification(firestore, {
            recipientId: targetThought.userId,
            type: "like",
            thoughtId,
            thoughtText: targetThought.sharedFromText || targetThought.text || ""
          });
        }
      }
    } catch (error) {
      setLikedThoughtIds((prev) => {
        const next = new Set(prev);
        if (wasLiked) {
          next.add(thoughtId);
        } else {
          next.delete(thoughtId);
        }
        return next;
      });
      setLikesCount((prev) => ({ ...prev, [thoughtId]: previousCount }));
      const message = error instanceof Error ? error.message : "Operazione non riuscita";
      toast({ title: message, variant: "destructive" });
    }
  };

  const loadComments = async (thoughtId: string) => {
    if (loadingComments.has(thoughtId)) return;
    const firestore = await loadFirestore();
    if (!firestore) {
      toast({ title: "Firebase non configurato", variant: "destructive" });
      return;
    }
    setLoadingComments((prev) => new Set(prev).add(thoughtId));
    try {
      const { db, collection, getDocs, query, where, orderBy } = firestore;
      let snapshot;
      try {
        snapshot = await getDocs(query(
          collection(db, "community_thought_comments"),
          where("thoughtId", "==", thoughtId),
          orderBy("createdAt", "desc")
        ));
      } catch {
        snapshot = await getDocs(query(
          collection(db, "community_thought_comments"),
          where("thoughtId", "==", thoughtId)
        ));
      }
      const items = snapshot.docs.map((entry) => {
        const data = entry.data() as Omit<ThoughtComment, "id" | "createdAt"> & {
          createdAt?: { toDate?: () => Date } | string | Date;
        };
        const createdAt = parseTimestamp(data.createdAt);
        return {
          id: entry.id,
          thoughtId: data.thoughtId,
          userId: data.userId,
          userName: data.userName || "Utente",
          userPhoto: data.userPhoto || "",
          text: data.text || "",
          createdAt
        };
      });
      setCommentsByThought((prev) => ({ ...prev, [thoughtId]: items }));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Errore caricamento commenti";
      toast({ title: message, variant: "destructive" });
    } finally {
      setLoadingComments((prev) => {
        const next = new Set(prev);
        next.delete(thoughtId);
        return next;
      });
    }
  };

  const handleToggleComments = (thoughtId: string) => {
    setCommentsOpen((prev) => {
      const next = new Set(prev);
      if (next.has(thoughtId)) {
        next.delete(thoughtId);
      } else {
        next.add(thoughtId);
        if (!commentsByThought[thoughtId]) {
          void loadComments(thoughtId);
        }
      }
      return next;
    });
  };

  const handleSubmitComment = async (thoughtId: string) => {
    if (!canAccess || !user) {
      toast({ title: "Accedi per commentare", variant: "destructive" });
      return;
    }
    const text = (commentInputs[thoughtId] || "").trim();
    if (!text) {
      toast({ title: "Il commento non può essere vuoto", variant: "destructive" });
      return;
    }
    const firestore = await loadFirestore();
    if (!firestore) {
      toast({ title: "Firebase non configurato", variant: "destructive" });
      return;
    }
    setSubmittingCommentId(thoughtId);
    const tempId = `temp-${Date.now()}`;
    const optimisticComment: ThoughtComment = {
      id: tempId,
      thoughtId,
      userId: user.uid,
      userName: user.displayName || user.email || "Utente",
      userPhoto: user.photoURL || "",
      text,
      createdAt: new Date()
    };
    setCommentsByThought((prev) => ({
      ...prev,
      [thoughtId]: [optimisticComment, ...(prev[thoughtId] || [])]
    }));
    setCommentInputs((prev) => ({ ...prev, [thoughtId]: "" }));
    try {
      const { db, addDoc, collection, serverTimestamp } = firestore;
      const payload = {
        thoughtId,
        userId: user.uid,
        userName: user.displayName || user.email || "Utente",
        userPhoto: user.photoURL || "",
        text,
        createdAt: serverTimestamp()
      };
      const docRef = await addDoc(collection(db, "community_thought_comments"), payload);
      const newComment: ThoughtComment = {
        id: docRef.id,
        thoughtId,
        userId: payload.userId,
        userName: payload.userName,
        userPhoto: payload.userPhoto,
        text: payload.text,
        createdAt: new Date()
      };
      setCommentsByThought((prev) => ({
        ...prev,
        [thoughtId]: [newComment, ...(prev[thoughtId] || []).filter((item) => item.id !== tempId)]
      }));
      const targetThought = thoughts.find((item) => item.id === thoughtId);
      if (targetThought?.userId && targetThought.userId !== user.uid) {
        await createNotification(firestore, {
          recipientId: targetThought.userId,
          type: "comment",
          thoughtId,
          thoughtText: targetThought.sharedFromText || targetThought.text || "",
          commentText: text
        });
      }
    } catch (error) {
      setCommentsByThought((prev) => ({
        ...prev,
        [thoughtId]: (prev[thoughtId] || []).filter((item) => item.id !== tempId)
      }));
      setCommentInputs((prev) => ({ ...prev, [thoughtId]: text }));
      const message = error instanceof Error ? error.message : "Commento non riuscito";
      toast({ title: message, variant: "destructive" });
    } finally {
      setSubmittingCommentId(null);
    }
  };

  const handleShareExistingThought = async (thought: ThoughtItem) => {
    if (!canAccess || !user) {
      toast({ title: "Accedi per condividere", variant: "destructive" });
      return;
    }
    const firestore = await loadFirestore();
    if (!firestore) {
      toast({ title: "Firebase non configurato", variant: "destructive" });
      return;
    }
    try {
      const { db, addDoc, collection, serverTimestamp } = firestore;
      const sharedFromId = thought.sharedFromId || thought.id;
      const sharedFromUserId = thought.sharedFromUserId || thought.userId;
      const sharedFromUserName = thought.sharedFromUserName || thought.userName;
      const sharedFromText = thought.sharedFromText || thought.text;
      const sharedFromTargetId = thought.sharedFromTargetId ?? thought.targetId ?? null;
      const sharedFromTargetType = thought.sharedFromTargetType ?? thought.targetType ?? null;
      const sharedFromTargetTitle = thought.sharedFromTargetTitle || thought.targetTitle || "";
      const payload = {
        userId: user.uid,
        userName: user.displayName || user.email || "Utente",
        userPhoto: user.photoURL || "",
        text: "",
        visibility: "public",
        targetId: thought.targetId ?? null,
        targetType: thought.targetType ?? null,
        targetTitle: thought.targetTitle || "",
        targetImage: thought.targetImage || "",
        sharedFromId,
        sharedFromUserId,
        sharedFromUserName,
        sharedFromText,
        sharedFromTargetId,
        sharedFromTargetType,
        sharedFromTargetTitle,
        createdAt: serverTimestamp()
      };
      const docRef = await addDoc(collection(db, "community_thoughts"), payload);
      const newThought: ThoughtItem = {
        id: docRef.id,
        userId: payload.userId,
        userName: payload.userName,
        userPhoto: payload.userPhoto,
        text: payload.text,
        visibility: payload.visibility as ThoughtVisibility,
        targetId: payload.targetId,
        targetType: payload.targetType,
        targetTitle: payload.targetTitle,
        targetImage: payload.targetImage,
        sharedFromId: payload.sharedFromId,
        sharedFromUserId: payload.sharedFromUserId,
        sharedFromUserName: payload.sharedFromUserName,
        sharedFromText: payload.sharedFromText,
        sharedFromTargetId: payload.sharedFromTargetId,
        sharedFromTargetType: payload.sharedFromTargetType,
        sharedFromTargetTitle: payload.sharedFromTargetTitle,
        createdAt: new Date()
      };
      setThoughts((prev) => [newThought, ...prev]);
      toast({ title: "Condivisione riuscita" });
      if (sharedFromUserId && sharedFromUserId !== user.uid) {
        await createNotification(firestore, {
          recipientId: sharedFromUserId,
          type: "share",
          thoughtId: sharedFromId,
          thoughtText: sharedFromText || ""
        });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Condivisione non riuscita";
      toast({ title: message, variant: "destructive" });
    }
  };

  const handleEditThought = (thought: ThoughtItem) => {
    setEditingThoughtId(thought.id);
    setEditingThoughtText(thought.text);
    setEditingThoughtVisibility(thought.visibility);
  };

  const handleCancelEdit = () => {
    setEditingThoughtId(null);
    setEditingThoughtText("");
    setEditingThoughtVisibility("public");
  };

  const handleSaveEdit = async () => {
    if (!editingThoughtId) return;
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
      const thoughtRef = doc(db, "community_thoughts", editingThoughtId);
      await updateDoc(thoughtRef, {
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
      handleCancelEdit();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Modifica non riuscita";
      toast({ title: message, variant: "destructive" });
    } finally {
      setIsSavingThought(false);
    }
  };

  const handleDeleteThought = async (thoughtId: string) => {
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
        handleCancelEdit();
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Eliminazione non riuscita";
      toast({ title: message, variant: "destructive" });
    } finally {
      setDeletingThoughtId(null);
    }
  };

  const handleLoadMore = async () => {
    if (!lastThoughtDoc || isLoadingMore) return;
    const firestore = await loadFirestore();
    if (!firestore) {
      toast({ title: "Firebase non configurato", variant: "destructive" });
      return;
    }
    setIsLoadingMore(true);
    try {
      const { db, collection, getDocs, query, orderBy, limit, startAfter, where, doc, getDoc } = firestore;
      let snapshot;
      try {
        snapshot = await getDocs(query(
          collection(db, "community_thoughts"),
          orderBy("createdAt", "desc"),
          startAfter(lastThoughtDoc),
          limit(PAGE_SIZE)
        ));
      } catch {
        setHasMore(false);
        return;
      }
      const thoughtItems = mapThoughtDocs(snapshot.docs);
      const visibleThoughts = thoughtItems.filter((item) => {
        if (item.userId === user?.uid) return true;
        if (item.visibility === "public") return true;
        if (item.visibility === "followers" && followedIds.has(item.userId)) return true;
        return false;
      });
      const sortedThoughts = visibleThoughts.sort((a, b) => {
        if (!a.createdAt && !b.createdAt) return 0;
        if (!a.createdAt) return 1;
        if (!b.createdAt) return -1;
        return b.createdAt.getTime() - a.createdAt.getTime();
      });
      setLastThoughtDoc(snapshot.docs[snapshot.docs.length - 1] || lastThoughtDoc);
      setHasMore(snapshot.docs.length === PAGE_SIZE);
      if (sortedThoughts.length === 0) {
        return;
      }
      setThoughts((prev) => [...prev, ...sortedThoughts]);

      const likeCounts: Record<string, number> = {};
      const likedIds = new Set<string>();
      await Promise.all(sortedThoughts.map(async (item) => {
        try {
          const likeSnapshot = await getDocs(query(
            collection(db, "community_thought_likes"),
            where("thoughtId", "==", item.id)
          ));
          likeCounts[item.id] = likeSnapshot.size;
          if (user) {
            const likeDoc = await getDoc(doc(db, "community_thought_likes", `${item.id}_${user.uid}`));
            if (likeDoc.exists()) {
              likedIds.add(item.id);
            }
          }
        } catch {
          likeCounts[item.id] = likeCounts[item.id] ?? 0;
        }
      }));
      setLikesCount((prev) => ({ ...prev, ...likeCounts }));
      setLikedThoughtIds((prev) => {
        const next = new Set(prev);
        likedIds.forEach((id) => next.add(id));
        return next;
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Caricamento non riuscito";
      toast({ title: message, variant: "destructive" });
    } finally {
      setIsLoadingMore(false);
    }
  };

  useEffect(() => {
    if (targetType !== "none") return;
    setTargetQuery("");
    setTargetResults([]);
    setSelectedTarget(null);
  }, [targetType]);

  const handleSearchTarget = async () => {
    const queryText = targetQuery.trim();
    if (!queryText) {
      toast({ title: "Inserisci una ricerca", variant: "destructive" });
      return;
    }
    setIsSearchingTarget(true);
    try {
      const { results } = await tmdbApi.search(queryText, 1, { includePeople: true });
      const filtered = results.filter((item) => {
        if (targetType === "movie") return item.media_type === "movie";
        if (targetType === "tv") return item.media_type === "tv";
        if (targetType === "person") return item.media_type === "person";
        if (targetType === "content") return item.media_type === "movie" || item.media_type === "tv";
        return false;
      });
      setTargetResults(filtered.slice(0, 10));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Ricerca non riuscita";
      toast({ title: message, variant: "destructive" });
    } finally {
      setIsSearchingTarget(false);
    }
  };

  const handleSelectTarget = (item: MediaItem) => {
    const title = "title" in item ? item.title : "name" in item ? item.name : "";
    const imagePath = item.media_type === "person" ? item.profile_path || item.poster_path : item.poster_path;
    setSelectedTarget({
      id: item.id,
      mediaType: item.media_type || "movie",
      title: title || "Contenuto",
      imagePath: imagePath || null
    });
    setTargetResults([]);
  };

  const seoTitle = "Community NextTrailer";
  const seoDescription = "Scopri cosa guardano gli altri appassionati di cinema e serie TV.";

  if (!canAccess) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <SEO title={seoTitle} description={seoDescription} />
        <Navbar />
        <main className="max-w-screen-lg mx-auto px-4 py-12 text-center space-y-4">
          <h1 className="text-2xl font-semibold">Community</h1>
          <p className="text-muted-foreground">Accedi per vedere il feed degli utenti.</p>
          <p className="text-sm text-muted-foreground">Apri il menu in alto a destra per accedere o registrarti.</p>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SEO title={seoTitle} description={seoDescription} />
      <Navbar />
      <main className="max-w-screen-xl mx-auto px-4 md:px-8 py-8 space-y-8">
        <div>
          <h1 className="text-3xl font-bold">Community</h1>
          <p className="text-muted-foreground">Segui le attività degli appassionati di cinema e serie TV.</p>
        </div>

        {isLoading && (
          <div className="h-[40vh] flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent"></div>
          </div>
        )}

        {error && (
          <div className="text-sm text-destructive">{error}</div>
        )}

        {!isLoading && !error && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              <CommunityComposer
                user={user}
                thoughtText={thoughtText}
                onThoughtTextChange={setThoughtText}
                thoughtVisibility={thoughtVisibility}
                onThoughtVisibilityChange={setThoughtVisibility}
                targetType={targetType}
                onTargetTypeChange={setTargetType}
                targetQuery={targetQuery}
                onTargetQueryChange={setTargetQuery}
                selectedTarget={selectedTarget}
                onClearTarget={() => setSelectedTarget(null)}
                targetResults={targetResults}
                isSearchingTarget={isSearchingTarget}
                onSearchTarget={handleSearchTarget}
                onSelectTarget={handleSelectTarget}
                isPosting={isPosting}
                onShare={handleShareThought}
              />
              <CommunityThoughtList
                thoughts={thoughts}
                currentUserId={user?.uid}
                editingThoughtId={editingThoughtId}
                editingThoughtText={editingThoughtText}
                editingThoughtVisibility={editingThoughtVisibility}
                onEditThought={handleEditThought}
                onSaveEdit={handleSaveEdit}
                onCancelEdit={handleCancelEdit}
                onDeleteThought={handleDeleteThought}
                deletingThoughtId={deletingThoughtId}
                onEditTextChange={setEditingThoughtText}
                onEditVisibilityChange={setEditingThoughtVisibility}
                onToggleLike={handleToggleLike}
                onToggleComments={handleToggleComments}
                onShare={handleShareExistingThought}
                likedThoughtIds={likedThoughtIds}
                likesCount={likesCount}
                commentsOpen={commentsOpen}
                commentsByThought={commentsByThought}
                commentInputs={commentInputs}
                onCommentInputChange={(thoughtId, value) =>
                  setCommentInputs((prev) => ({ ...prev, [thoughtId]: value }))
                }
                onSubmitComment={handleSubmitComment}
                submittingCommentId={submittingCommentId}
                loadingComments={loadingComments}
                isSavingThought={isSavingThought}
                hasMore={hasMore}
                isLoadingMore={isLoadingMore}
                onLoadMore={handleLoadMore}
              />
            </div>
            <CommunitySidebar
              userId={user?.uid}
              userSearchQuery={userSearchQuery}
              onUserSearchQueryChange={setUserSearchQuery}
              onSearchUsers={handleSearchUsers}
              isSearchingUsers={isSearchingUsers}
              userSearchResults={userSearchResults}
              followedIds={followedIds}
              suggestions={suggestions}
              onToggleFollow={handleToggleFollow}
            />
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default CommunityPage;
