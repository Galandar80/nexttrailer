"use client";

import { useState, useEffect, lazy, Suspense, useMemo, useCallback, FormEvent, useRef } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Image as ImageIcon, Film } from "lucide-react";
import { tmdbApi, MediaDetails as MediaDetailsType, MediaItem, Trailer } from "@/services/tmdbApi";
import Navbar from "@/components/Navbar";
import ContentRow from "@/components/ContentRow";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import ActorCard from "@/components/ActorCard";
import { getDb, getFirestoreModule, isFirebaseEnabled } from "@/services/firebase";
const MediaReviews = lazy(() => import("@/components/MediaReviews"));
const TvSeasons = lazy(() => import("@/components/TvSeasons"));
const MediaGallery = lazy(() => import("@/components/MediaGallery"));
import { OptimizedImage } from "@/components/OptimizedImage";
// import ActorDetails from "@/components/ActorDetails"; // No longer needed here
import { useWatchlistStore } from "@/store/useWatchlistStore";
import { useLibraryStore, LibraryItem } from "@/store/useLibraryStore";
import { SEO } from "@/components/SEO";

// Sub-components
import { MediaHero } from "@/components/media/MediaHero";
import { MediaInfo } from "@/components/media/MediaInfo";
import { MediaActions } from "@/components/media/MediaActions";
const MediaTrivia = lazy(() =>
  import("@/components/media/MediaTrivia").then((mod) => ({ default: mod.MediaTrivia }))
);
const WatchProvidersDialog = lazy(() =>
  import("@/components/media/WatchProvidersDialog").then((mod) => ({ default: mod.WatchProvidersDialog }))
);
import { useAuth } from "@/context/auth-core";

type MediaComment = {
  id: string;
  userId: string;
  userName: string;
  text: string;
  createdAt?: Date | null;
};

type MediaRating = {
  id: string;
  userId: string;
  userName: string;
  rating: number;
  updatedAt?: Date | null;
};

type UserListItem = {
  mediaId: number;
  mediaType: "movie" | "tv";
  title: string;
  posterPath?: string | null;
};

type UserList = {
  id: string;
  ownerId: string;
  name: string;
  description?: string;
  isPublic: boolean;
  items: UserListItem[];
  createdAt?: Date | null;
  updatedAt?: Date | null;
};

const MediaDetailsPage = () => {
  const params = useParams();
  const router = useRouter();
  const rawMediaType = Array.isArray(params.mediaType) ? params.mediaType[0] : params.mediaType;
  const mediaType = rawMediaType === "movie" || rawMediaType === "tv" ? rawMediaType : undefined;
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const [media, setMedia] = useState<MediaDetailsType | null>(null);
  const [similarContent, setSimilarContent] = useState<MediaItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showVideo, setShowVideo] = useState(false);
  const [showTrivia, setShowTrivia] = useState(false);
  const [trailers, setTrailers] = useState<Trailer[]>([]);
  const [showReviews, setShowReviews] = useState(false);
  const [showSeasons, setShowSeasons] = useState(false);
  const [showGallery, setShowGallery] = useState(false);
  // const [showActorDetails, setShowActorDetails] = useState(false); // Deprecated
  // const [selectedActorId, setSelectedActorId] = useState<number | null>(null); // Deprecated
  const [showWatchProviders, setShowWatchProviders] = useState(false);
  const [trivia, setTrivia] = useState<{ facts: string[], controversies: string[] }>({
    facts: [],
    controversies: []
  });
  const [comments, setComments] = useState<MediaComment[]>([]);
  const [isCommentsLoading, setIsCommentsLoading] = useState(false);
  const [ratings, setRatings] = useState<MediaRating[]>([]);
  const [isRatingsLoading, setIsRatingsLoading] = useState(false);
  const [ratingValue, setRatingValue] = useState(0);
  const [ratingError, setRatingError] = useState<string | null>(null);
  const [isSubmittingRating, setIsSubmittingRating] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [commentError, setCommentError] = useState<string | null>(null);
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [isDeletingCommentId, setIsDeletingCommentId] = useState<string | null>(null);
  const [userLists, setUserLists] = useState<UserList[]>([]);
  const [isListsLoading, setIsListsLoading] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [selectedListId, setSelectedListId] = useState("");
  const [newListName, setNewListName] = useState("");
  const [newListDescription, setNewListDescription] = useState("");
  const [isListPublic, setIsListPublic] = useState(true);
  const [isCreatingList, setIsCreatingList] = useState(false);
  const [isAddingToList, setIsAddingToList] = useState(false);
  const { toast } = useToast();
  const { addItem, removeItem, isInWatchlist } = useWatchlistStore();
  const { addItem: addLibraryItem, removeItem: removeLibraryItem, getItem, markMovieWatched } = useLibraryStore();
  const { canAccess, user } = useAuth();
  const isSuperAdmin = user?.email?.toLowerCase() === "calisma82@gmail.com";

  /* Background Trailer State */
  const [showBackgroundTrailer, setShowBackgroundTrailer] = useState(false);
  const commentsRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (!isLoading && trailers.length > 0 && !showVideo) {
      timer = setTimeout(() => {
        setShowBackgroundTrailer(true);
      }, 3000); // Start after 3 seconds
    }

    return () => {
      if (timer) clearTimeout(timer);
      setShowBackgroundTrailer(false);
    };
  }, [isLoading, trailers, showVideo, id]);

  useEffect(() => {
    let isMounted = true;

    const loadDetails = async () => {
      if (!mediaType || !id) return;

      setIsLoading(true);
      setMedia(null);
      setTrailers([]);
      setSimilarContent([]);
      setShowVideo(false);
      setShowBackgroundTrailer(false);

      try {
        const details = await tmdbApi.getDetails(Number(id), mediaType);

        if (!isMounted) return;

        if (details) {
          const [similar, mediaTrailers] = await Promise.all([
            tmdbApi.getSimilar(Number(id), mediaType),
            tmdbApi.getTrailers(Number(id), mediaType)
          ]);

          if (!isMounted) return;

          setTrailers(mediaTrailers || []);
          setMedia(details);
          setSimilarContent(similar || []);

          // Generate trivia from keywords present in details
          if (details.keywords) {
            setupTrivia(details, mediaType);
          }
        }
      } catch (error) {
        if (!isMounted) return;
        console.error(`Errore nel caricamento dei dettagli ${mediaType}:`, error);
        toast({
          title: "Errore nel caricamento dei dettagli",
          description: "Riprova più tardi",
          variant: "destructive"
        });
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadDetails();

    return () => {
      isMounted = false;
    };
  }, [mediaType, id, toast]);

  const loadComments = useCallback(async () => {
    if (!id || !mediaType) return;
    if (!isFirebaseEnabled) {
      setComments([]);
      setIsCommentsLoading(false);
      return;
    }
    setIsCommentsLoading(true);
    setCommentError(null);
    try {
      const db = await getDb();
      const firestore = await getFirestoreModule();
      if (!db) {
        setCommentError("Firebase non configurato");
        setComments([]);
        return;
      }
      const { collection, getDocs, query, where, orderBy, limit } = firestore;
      let snapshot;
      try {
        const commentsQuery = query(
          collection(db, "media_comments"),
          where("mediaId", "==", Number(id)),
          where("mediaType", "==", mediaType),
          orderBy("createdAt", "desc"),
          limit(50)
        );
        snapshot = await getDocs(commentsQuery);
      } catch {
        const fallbackQuery = query(
          collection(db, "media_comments"),
          where("mediaId", "==", Number(id)),
          where("mediaType", "==", mediaType),
          limit(50)
        );
        snapshot = await getDocs(fallbackQuery);
      }
      const items = snapshot.docs.map((entry) => {
        const data = entry.data() as Omit<MediaComment, "id" | "createdAt"> & { createdAt?: { toDate?: () => Date } | string };
        let createdAt: Date | null = null;
        if (data.createdAt) {
          if (typeof data.createdAt === "string") {
            createdAt = new Date(data.createdAt);
          } else if (data.createdAt.toDate) {
            createdAt = data.createdAt.toDate();
          }
        }
        return {
          id: entry.id,
          userId: data.userId,
          userName: data.userName,
          text: data.text,
          createdAt
        };
      });
      const sortedItems = items.sort((a, b) => {
        if (!a.createdAt && !b.createdAt) return 0;
        if (!a.createdAt) return 1;
        if (!b.createdAt) return -1;
        return b.createdAt.getTime() - a.createdAt.getTime();
      });
      setComments(sortedItems);
    } catch (error) {
      console.error("Errore nel caricamento dei commenti:", error);
      setCommentError("Impossibile caricare i commenti");
    } finally {
      setIsCommentsLoading(false);
    }
  }, [id, mediaType]);

  useEffect(() => {
    void loadComments();
  }, [loadComments]);

  const loadRatings = useCallback(async () => {
    if (!id || !mediaType) return;
    if (!isFirebaseEnabled) {
      setRatings([]);
      setIsRatingsLoading(false);
      return;
    }
    setIsRatingsLoading(true);
    setRatingError(null);
    try {
      const db = await getDb();
      const firestore = await getFirestoreModule();
      if (!db) {
        setRatingError("Firebase non configurato");
        setRatings([]);
        return;
      }
      const { collection, getDocs, query, where, orderBy, limit } = firestore;
      let snapshot;
      try {
        const ratingsQuery = query(
          collection(db, "media_ratings"),
          where("mediaId", "==", Number(id)),
          where("mediaType", "==", mediaType),
          orderBy("updatedAt", "desc"),
          limit(200)
        );
        snapshot = await getDocs(ratingsQuery);
      } catch {
        const fallbackQuery = query(
          collection(db, "media_ratings"),
          where("mediaId", "==", Number(id)),
          where("mediaType", "==", mediaType),
          limit(200)
        );
        snapshot = await getDocs(fallbackQuery);
      }
      const items = snapshot.docs.map((entry) => {
        const data = entry.data() as Omit<MediaRating, "id" | "updatedAt"> & { updatedAt?: { toDate?: () => Date } | string };
        let updatedAt: Date | null = null;
        if (data.updatedAt) {
          if (typeof data.updatedAt === "string") {
            updatedAt = new Date(data.updatedAt);
          } else if (data.updatedAt.toDate) {
            updatedAt = data.updatedAt.toDate();
          }
        }
        return {
          id: entry.id,
          userId: data.userId,
          userName: data.userName,
          rating: data.rating,
          updatedAt
        };
      });
      setRatings(items);
      if (user) {
        const existing = items.find((item) => item.userId === user.uid);
        if (existing) {
          setRatingValue(existing.rating);
        }
      }
    } catch (error) {
      console.error("Errore nel caricamento dei voti:", error);
      setRatingError("Impossibile caricare i voti");
    } finally {
      setIsRatingsLoading(false);
    }
  }, [id, mediaType, user]);

  useEffect(() => {
    void loadRatings();
  }, [loadRatings]);

  const ratingSummary = useMemo(() => {
    const ratingsList = ratings.map((item) => item.rating).filter((value) => Number.isFinite(value) && value > 0);
    if (!ratingsList.length) {
      return { average: "—", count: 0 };
    }
    const total = ratingsList.reduce((sum, value) => sum + value, 0);
    return { average: (total / ratingsList.length).toFixed(1), count: ratingsList.length };
  }, [ratings]);

  const mediaTitle = useMemo(() => {
    if (!media) return "";
    return mediaType === "movie" ? media.title || "" : media.name || "";
  }, [media, mediaType]);

  const logActivity = useCallback(async (payload: {
    type: "rating" | "comment" | "list_add";
    rating?: number;
    commentText?: string;
    listId?: string;
    listName?: string;
  }) => {
    if (!isFirebaseEnabled || !user || !id || !mediaType) return;
    try {
      const db = await getDb();
      const firestore = await getFirestoreModule();
      if (!db) return;
      const { addDoc, collection, serverTimestamp } = firestore;
      await addDoc(collection(db, "user_activity"), {
        userId: user.uid,
        userName: user.displayName || user.email || "Utente",
        userPhoto: user.photoURL || "",
        type: payload.type,
        rating: payload.rating ?? null,
        commentText: payload.commentText ?? "",
        listId: payload.listId ?? "",
        listName: payload.listName ?? "",
        mediaId: Number(id),
        mediaType,
        mediaTitle,
        posterPath: media?.poster_path || null,
        createdAt: serverTimestamp()
      });
    } catch (error) {
      console.error("Errore nel tracciamento attività:", error);
    }
  }, [id, mediaType, media, mediaTitle, user]);

  const loadUserLists = useCallback(async () => {
    if (!isFirebaseEnabled || !canAccess || !user) {
      setUserLists([]);
      setIsListsLoading(false);
      return;
    }
    setIsListsLoading(true);
    setListError(null);
    try {
      const db = await getDb();
      const firestore = await getFirestoreModule();
      if (!db) {
        setListError("Firebase non configurato");
        setUserLists([]);
        return;
      }
      const { collection, getDocs, query, where, orderBy } = firestore;
      let snapshot;
      try {
        const listsQuery = query(
          collection(db, "user_lists"),
          where("ownerId", "==", user.uid),
          orderBy("updatedAt", "desc")
        );
        snapshot = await getDocs(listsQuery);
      } catch {
        const listsQuery = query(
          collection(db, "user_lists"),
          where("ownerId", "==", user.uid)
        );
        snapshot = await getDocs(listsQuery);
      }
      const items = snapshot.docs.map((entry) => {
        const data = entry.data() as Omit<UserList, "id" | "createdAt" | "updatedAt"> & {
          createdAt?: { toDate?: () => Date } | string;
          updatedAt?: { toDate?: () => Date } | string;
        };
        let createdAt: Date | null = null;
        if (data.createdAt) {
          if (typeof data.createdAt === "string") {
            createdAt = new Date(data.createdAt);
          } else if (data.createdAt.toDate) {
            createdAt = data.createdAt.toDate();
          }
        }
        let updatedAt: Date | null = null;
        if (data.updatedAt) {
          if (typeof data.updatedAt === "string") {
            updatedAt = new Date(data.updatedAt);
          } else if (data.updatedAt.toDate) {
            updatedAt = data.updatedAt.toDate();
          }
        }
        return {
          id: entry.id,
          ownerId: data.ownerId,
          name: data.name,
          description: data.description || "",
          isPublic: Boolean(data.isPublic),
          items: Array.isArray(data.items) ? data.items : [],
          createdAt,
          updatedAt
        };
      });
      const sorted = items.sort((a, b) => {
        if (!a.updatedAt && !b.updatedAt) return 0;
        if (!a.updatedAt) return 1;
        if (!b.updatedAt) return -1;
        return b.updatedAt.getTime() - a.updatedAt.getTime();
      });
      setUserLists(sorted);
    } catch (error) {
      console.error("Errore nel caricamento delle liste:", error);
      setListError("Impossibile caricare le liste");
    } finally {
      setIsListsLoading(false);
    }
  }, [canAccess, user]);

  useEffect(() => {
    void loadUserLists();
  }, [loadUserLists]);

  const handleCreateList = async () => {
    if (!canAccess || !user) {
      toast({
        title: "Accedi per creare una lista",
        description: "Effettua l'accesso per creare una lista personale",
        variant: "destructive"
      });
      return;
    }
    if (!newListName.trim()) {
      setListError("Inserisci un nome per la lista");
      return;
    }
    if (!isFirebaseEnabled) {
      setListError("Firebase non configurato");
      return;
    }
    setIsCreatingList(true);
    setListError(null);
    try {
      const db = await getDb();
      const firestore = await getFirestoreModule();
      if (!db) {
        setListError("Firebase non configurato");
        return;
      }
      const { addDoc, collection, serverTimestamp } = firestore;
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
      await loadUserLists();
      toast({
        title: "Lista creata",
        description: "La tua lista è pronta"
      });
    } catch (error) {
      console.error("Errore nella creazione lista:", error);
      setListError("Errore nella creazione lista");
    } finally {
      setIsCreatingList(false);
    }
  };

  const handleAddToList = async () => {
    if (!id || !mediaType || !media) return;
    if (!canAccess || !user) {
      toast({
        title: "Accedi per salvare",
        description: "Effettua l'accesso per salvare in una lista",
        variant: "destructive"
      });
      return;
    }
    if (!selectedListId) {
      setListError("Seleziona una lista");
      return;
    }
    if (!isFirebaseEnabled) {
      setListError("Firebase non configurato");
      return;
    }
    setIsAddingToList(true);
    setListError(null);
    try {
      const db = await getDb();
      const firestore = await getFirestoreModule();
      if (!db) {
        setListError("Firebase non configurato");
        return;
      }
      const { doc, getDoc, setDoc, serverTimestamp } = firestore;
      const listRef = doc(db, "user_lists", selectedListId);
      const snapshot = await getDoc(listRef);
      if (!snapshot.exists()) {
        setListError("Lista non trovata");
        return;
      }
      const data = snapshot.data() as Omit<UserList, "id">;
      const existingItems = Array.isArray(data.items) ? data.items : [];
      const newItem: UserListItem = {
        mediaId: Number(id),
        mediaType,
        title: mediaTitle,
        posterPath: media.poster_path || null
      };
      const alreadyExists = existingItems.some((item) => item.mediaId === newItem.mediaId && item.mediaType === newItem.mediaType);
      const updatedItems = alreadyExists ? existingItems : [newItem, ...existingItems];
      await setDoc(listRef, {
        items: updatedItems,
        updatedAt: serverTimestamp()
      }, { merge: true });
      await loadUserLists();
      await logActivity({ type: "list_add", listId: selectedListId, listName: data.name });
      toast({
        title: "Aggiunto alla lista",
        description: alreadyExists ? "Questo titolo era già presente" : "Titolo aggiunto con successo"
      });
    } catch (error) {
      console.error("Errore nel salvataggio in lista:", error);
      setListError("Errore nel salvataggio in lista");
    } finally {
      setIsAddingToList(false);
    }
  };

  const formatCommentDate = (value?: Date | null) => {
    if (!value) return "";
    return value.toLocaleDateString("it-IT", {
      year: "numeric",
      month: "long",
      day: "numeric"
    });
  };

  const handleSubmitRating = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!id || !mediaType) return;
    if (!canAccess || !user) {
      toast({
        title: "Accedi per votare",
        description: "Effettua l'accesso per lasciare un voto",
        variant: "destructive"
      });
      return;
    }
    if (ratingValue < 1) {
      setRatingError("Seleziona un voto");
      return;
    }
    if (!isFirebaseEnabled) {
      setRatingError("Firebase non configurato");
      return;
    }
    setIsSubmittingRating(true);
    setRatingError(null);
    try {
      const db = await getDb();
      const firestore = await getFirestoreModule();
      if (!db) {
        setRatingError("Firebase non configurato");
        return;
      }
      const { doc, setDoc, serverTimestamp } = firestore;
      const ratingId = `${mediaType}-${id}-${user.uid}`;
      await setDoc(doc(db, "media_ratings", ratingId), {
        mediaId: Number(id),
        mediaType,
        userId: user.uid,
        userName: user.displayName || user.email || "Utente",
        rating: ratingValue,
        updatedAt: serverTimestamp()
      }, { merge: true });
      await logActivity({ type: "rating", rating: ratingValue });
      await loadRatings();
      toast({
        title: "Voto salvato",
        description: "Il tuo voto è stato aggiornato"
      });
    } catch (error) {
      console.error("Errore nel salvataggio del voto:", error);
      setRatingError("Errore nel salvataggio del voto");
    } finally {
      setIsSubmittingRating(false);
    }
  };

  const handleSubmitComment = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!id || !mediaType) return;
    if (!canAccess || !user) {
      toast({
        title: "Accedi per commentare",
        description: "Effettua l'accesso per lasciare un commento",
        variant: "destructive"
      });
      return;
    }
    if (!commentText.trim()) {
      setCommentError("Inserisci un commento");
      return;
    }
    if (!isFirebaseEnabled) {
      setCommentError("Firebase non configurato");
      return;
    }
    setIsSubmittingComment(true);
    setCommentError(null);
    try {
      const db = await getDb();
      const firestore = await getFirestoreModule();
      if (!db) {
        setCommentError("Firebase non configurato");
        return;
      }
      const { addDoc, collection, serverTimestamp } = firestore;
      await addDoc(collection(db, "media_comments"), {
        mediaId: Number(id),
        mediaType,
        userId: user.uid,
        userName: user.displayName || user.email || "Utente",
        text: commentText.trim(),
        createdAt: serverTimestamp()
      });
      await logActivity({ type: "comment", commentText: commentText.trim() });
      setCommentText("");
      await loadComments();
      toast({
        title: "Commento pubblicato",
        description: "Il tuo commento è stato aggiunto"
      });
    } catch (error) {
      console.error("Errore nel salvataggio del commento:", error);
      setCommentError("Errore nel salvataggio del commento");
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!isFirebaseEnabled) return;
    if (!canAccess || !user) return;
    const isSuperAdmin = user.email?.toLowerCase() === "calisma82@gmail.com";
    if (!isSuperAdmin) return;
    setIsDeletingCommentId(commentId);
    try {
      const db = await getDb();
      const firestore = await getFirestoreModule();
      if (!db) {
        setCommentError("Firebase non configurato");
        return;
      }
      const { deleteDoc, doc } = firestore;
      await deleteDoc(doc(db, "media_comments", commentId));
      setComments((prev) => prev.filter((comment) => comment.id !== commentId));
      toast({
        title: "Commento rimosso",
        description: "Il commento è stato eliminato"
      });
    } catch (error) {
      console.error("Errore nella rimozione del commento:", error);
      setCommentError("Errore nella rimozione del commento");
    } finally {
      setIsDeletingCommentId(null);
    }
  };

  const setupTrivia = (details: MediaDetailsType, type: "movie" | "tv") => {
    try {
      // Access keywords correctly based on structure
      const keywordsData = details.keywords;
      const keywords = type === "movie" ? keywordsData?.keywords : keywordsData?.results;

      if (keywords && keywords.length > 0) {
        const facts = keywords
          .filter(() => Math.random() > 0.5)
          .map((keyword) => {
            const factStarters = [
              `Questo ${type === "movie" ? "film" : "show"} è noto per la tematica "${keyword.name}" che è centrale nella trama.`,
              `La produzione ha dedicato particolare attenzione all'aspetto "${keyword.name}" durante le riprese.`,
              `Critici e fan hanno apprezzato particolarmente come "${keyword.name}" sia stato rappresentato in questo ${type === "movie" ? "film" : "show"}.`,
              `Una delle scene più iconiche è legata alla tematica "${keyword.name}".`,
              `Il ${type === "movie" ? "regista" : "creatore"} ha dichiarato che "${keyword.name}" è stato uno degli elementi più complessi da portare sullo schermo.`
            ];
            return factStarters[Math.floor(Math.random() * factStarters.length)];
          });

        const controversies = [];
        if (keywords.length > 2) {
          const controversyTopics = keywords.slice(0, 2);
          for (const topic of controversyTopics) {
            const controversyStarters = [
              `La rappresentazione di "${topic.name}" ha generato dibattito tra critici e pubblico.`,
              `Alcuni gruppi hanno criticato la modalità con cui "${topic.name}" è stato affrontato nella storia.`,
              `Durante la produzione, ci sono state tensioni su come trattare il tema "${topic.name}".`,
              `In alcuni paesi, il ${type === "movie" ? "film" : "show"} ha ricevuto censure proprio per la presenza del tema "${topic.name}".`
            ];
            controversies.push(controversyStarters[Math.floor(Math.random() * controversyStarters.length)]);
          }
        }

        // Budget/Revenue facts
        if (type === "movie" && details) {
          if (details.budget && details.budget > 0) {
            facts.push(`Il budget di produzione di ${details.title || ""} è stato di ${new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(details.budget)}, considerato ${details.budget > 100000000 ? "elevato" : "nella media"} per produzioni di questo genere.`);
          }
          if (details.revenue && details.revenue > 0) {
            const profit = details.revenue - (details.budget || 0);
            facts.push(`Il film ha generato un incasso mondiale di ${new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(details.revenue)}, ${profit > 0 ? `con un profitto di circa ${new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(profit)}.` : "che non è riuscito a coprire i costi di produzione."}`);
          }
        }

        // TV Seasons facts
        if (type === "tv" && details) {
          if (details.number_of_seasons && details.number_of_episodes) {
            facts.push(`Con ${details.number_of_seasons} stagioni e ${details.number_of_episodes} episodi in totale, ${details.name || ""} è ${details.number_of_seasons > 5 ? "una delle serie più longeve" : "una serie di media durata"} nel suo genere.`);
          }
          if (details.created_by && details.created_by.length > 0) {
            facts.push(`Tra i creatori della serie figura ${details.created_by.map(creator => creator.name).join(", ")}, ${details.created_by.length > 1 ? "che hanno" : "che ha"} voluto esplorare nuovi temi televisivi.`);
          }
        }

        setTrivia({
          facts: facts.length > 0 ? facts : ["Informazioni dettagliate su questo titolo non sono attualmente disponibili."],
          controversies: controversies.length > 0 ? controversies : ["Non sono state rilevate particolari controversie legate a questo titolo."]
        });
      }
    } catch (error) {
      console.error("Errore nel setup delle curiosità:", error);
      setTrivia({
        facts: ["Informazioni dettagliate su questo titolo non sono attualmente disponibili."],
        controversies: ["Non sono state rilevate particolari controversie legate a questo titolo."]
      });
    }
  };

  const handlePlayTrailer = () => {
    if (trailers?.length) {
      setShowVideo(true);
    } else {
      toast({
        title: "Nessun trailer disponibile",
        description: "Non è stato possibile trovare un trailer per questo contenuto",
        variant: "default"
      });
    }
  };

  const handleShowReviews = () => setShowReviews(true);
  const handleShowSeasons = () => setShowSeasons(true);
  const handleShowGallery = () => setShowGallery(true);
  const handleShowComments = () => {
    commentsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const buildLibraryItem = (): LibraryItem | null => {
    if (!media || !mediaType || !id) return null;
    const now = new Date().toISOString();
    const status: LibraryItem["status"] = mediaType === "tv" ? "watching" : "planned";
    return {
      id: Number(id),
      media_type: mediaType,
      title: media.title,
      name: media.name,
      poster_path: media.poster_path,
      backdrop_path: media.backdrop_path,
      release_date: media.release_date,
      first_air_date: media.first_air_date,
      status,
      addedAt: now,
      updatedAt: now
    };
  };

  const handleToggleLibrary = async () => {
    if (!mediaType || !id) return;
    const existing = getItem(Number(id), mediaType);
    if (existing) {
      await removeLibraryItem(Number(id), mediaType);
      toast({
        title: "Rimosso dallo storico",
        description: "Il contenuto è stato rimosso dal tuo storico personale."
      });
      return;
    }
    const item = buildLibraryItem();
    if (!item) return;
    await addLibraryItem(item);
    toast({
      title: "Aggiunto allo storico",
      description: "Il contenuto è stato aggiunto al tuo storico personale."
    });
  };

  const handleMarkWatched = async () => {
    if (!mediaType || mediaType !== "movie" || !id) return;
    const existing = getItem(Number(id), mediaType);
    if (!existing) {
      const now = new Date().toISOString();
      await addLibraryItem({
        id: Number(id),
        media_type: "movie",
        title: media?.title,
        poster_path: media?.poster_path,
        backdrop_path: media?.backdrop_path,
        release_date: media?.release_date,
        status: "completed",
        addedAt: now,
        updatedAt: now,
        watchedAt: now
      });
    } else {
      await markMovieWatched(Number(id));
    }
    toast({
      title: "Segnato come visto",
      description: "Il film è stato aggiornato nello storico."
    });
  };

  const handleViewActorDetails = (actorId: number) => {
    router.push(`/person/${actorId}`);
  };

  const handleAddToWatchlist = () => {
    if (!media || !mediaType || !id) return;

    const inWatchlist = isInWatchlist(Number(id), mediaType);

    if (inWatchlist) {
      removeItem(Number(id), mediaType);
      toast({
        title: "Rimosso dalla Watchlist",
        description: `${media?.title || media?.name} è stato rimosso dalla tua watchlist`,
        variant: "default"
      });
    } else {
      const watchlistItem: MediaItem = {
        id: media.id,
        title: media.title,
        name: media.name,
        poster_path: media.poster_path,
        backdrop_path: media.backdrop_path,
        media_type: mediaType,
        vote_average: media.vote_average,
        overview: media.overview,
        popularity: media.popularity,
        vote_count: media.vote_count,
        release_date: media.release_date,
        first_air_date: media.first_air_date,
        genre_ids: media.genres?.map(g => g.id) || [],
      };

      addItem(watchlistItem);
      toast({
        title: "Aggiunto alla Watchlist",
        description: `${media?.title || media?.name} è stato aggiunto alla tua watchlist`,
        variant: "default"
      });
    }
  };

  const handleShare = () => {
    // Keep share logic simple for now or move to util
    if (navigator.share) {
      navigator.share({
        title: media?.title || media?.name,
        text: `Guarda ${media?.title || media?.name} su FilmFlare!`,
        url: window.location.href,
      }).catch(console.error);
    } else {
      toast({
        title: "Condivisione",
        description: "Condivisione non supportata su questo browser. Link copiato.",
      });
      navigator.clipboard.writeText(window.location.href);
    }
  };

  const handleShowTrivia = () => setShowTrivia(!showTrivia);
  const handleWatchNow = () => setShowWatchProviders(true);
  const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL || "").replace(/\/$/, "");
  const seoUrl = useMemo(() => {
    if (typeof window !== "undefined") return window.location.href;
    if (baseUrl && mediaType && id) return `${baseUrl}/${mediaType}/${id}`;
    return baseUrl || "";
  }, [baseUrl, id, mediaType]);
  const seoJsonLd = useMemo(() => {
    if (!media) return null;
    const titleValue = mediaType === "movie" ? media.title : media.name;
    const releaseDateValue = mediaType === "movie" ? media.release_date : media.first_air_date;
    const backdrop = media.backdrop_path ? tmdbApi.getImageUrl(media.backdrop_path, "original") : "";
    const poster = media.poster_path ? tmdbApi.getImageUrl(media.poster_path, "w500") : "";
    const images = [backdrop, poster].filter(Boolean);
    const ratingValue = media.vote_average ? Number(media.vote_average.toFixed(1)) : undefined;
    const ratingCount = media.vote_count || undefined;
    const genres = media.genres?.map((genre) => genre.name).filter(Boolean) || [];
    const directorValue = media.credits?.crew?.find(person => person.job === "Director");
    const creatorsValue = media.created_by || [];
    const schema: Record<string, unknown> = {
      "@context": "https://schema.org",
      "@type": mediaType === "movie" ? "Movie" : "TVSeries",
      name: titleValue || undefined,
      description: media.overview || undefined,
      image: images.length ? images : undefined,
      datePublished: releaseDateValue || undefined,
      url: seoUrl || undefined,
      genre: genres.length ? genres : undefined
    };
    if (ratingValue) {
      schema.aggregateRating = {
        "@type": "AggregateRating",
        ratingValue,
        ratingCount
      };
    }
    if (mediaType === "movie" && directorValue?.name) {
      schema.director = { "@type": "Person", name: directorValue.name };
    }
    if (mediaType === "tv" && creatorsValue.length) {
      schema.creator = creatorsValue.map((creator) => ({ "@type": "Person", name: creator.name }));
    }
    return schema;
  }, [media, mediaType, seoUrl]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <Navbar />
        <div className="h-[60vh] bg-secondary/20 animate-pulse flex items-center justify-center">Caricamento dettagli...</div>
      </div>
    );
  }

  if (!media) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <Navbar />
        <div className="h-[60vh] flex items-center justify-center flex-col">
          <h2 className="text-2xl mb-4">Contenuto non trovato</h2>
          <Link href="/" className="text-accent hover:underline">Torna alla Homepage</Link>
        </div>
      </div>
    );
  }

  const backdropUrl = tmdbApi.getImageUrl(media.backdrop_path, "original");
  const posterUrl = tmdbApi.getImageUrl(media.poster_path, "w500");
  const title = mediaType === "movie" ? media.title : media.name;
  const releaseDate = mediaType === "movie" ? media.release_date : media.first_air_date;
  const releaseYear = releaseDate ? new Date(releaseDate).getFullYear().toString() : "";

  const trailer = trailers?.length > 0 ? trailers[0] : null;

  // Runtime String
  const getRuntimeString = () => {
    if (mediaType === "movie" && media.runtime) {
      const hours = Math.floor(media.runtime / 60);
      const minutes = media.runtime % 60;
      return `${hours}h ${minutes}m`;
    } else if (mediaType === "tv" && media.episode_run_time?.length) {
      const avgRuntime = media.episode_run_time[0];
      const hours = Math.floor(avgRuntime / 60);
      const minutes = avgRuntime % 60;
      return `${hours ? `${hours}h ` : ''}${minutes}m per episodio`;
    }
    return "Durata sconosciuta";
  };

  const mainCast = media.credits?.cast?.slice(0, 8) || [];
  const director = mediaType === "movie"
    ? media.credits?.crew?.find(person => person.job === "Director")
    : null;
  const creators = mediaType === "tv" ? media.created_by : null;
  const nextEpisode = mediaType === "tv" ? media.next_episode_to_air : undefined;

  const formatInfoDate = (value?: string) => {
    if (!value) return "—";
    return new Date(value).toLocaleDateString("it-IT", {
      year: "numeric",
      month: "long",
      day: "numeric"
    });
  };

  const tvInfoItems = mediaType === "tv" ? [
    { label: "Prossimo episodio", value: nextEpisode?.air_date ? formatInfoDate(nextEpisode.air_date) : "—" },
    { label: "Anno", value: releaseYear || "—" },
    { label: "Stato", value: media.status || "—" },
    { label: "Canale", value: media.networks?.[0]?.name || "—" },
    { label: "Stagioni", value: media.number_of_seasons ? String(media.number_of_seasons) : "—" },
    { label: "Episodi", value: media.number_of_episodes ? String(media.number_of_episodes) : "—" },
    { label: "Voto", value: media.vote_average ? `${media.vote_average.toFixed(1)} (${media.vote_count})` : "—" }
  ] : [];

  return (
    <div className="min-h-screen bg-background text-foreground">
      {media && (
        <SEO
          title={title || "Dettagli Media"}
          description={media.overview?.substring(0, 160) || `Scopri tutto su ${title}`}
          image={backdropUrl}
          type={mediaType === "movie" ? "video.movie" : "video.tv_show"}
          url={seoUrl || undefined}
          jsonLd={seoJsonLd || undefined}
        />
      )}
      <Navbar />

      <MediaHero
        backdropUrl={backdropUrl}
        title={title || ""}
        trailer={trailer}
        showBackgroundTrailer={showBackgroundTrailer}
        showVideo={showVideo}
        setShowVideo={setShowVideo}
      />

      {/* Modals */}
      {showReviews && id && mediaType && (
        <Suspense fallback={null}>
          <MediaReviews mediaId={Number(id)} mediaType={mediaType} onClose={() => setShowReviews(false)} />
        </Suspense>
      )}
      {showSeasons && id && mediaType === "tv" && (
        <Suspense fallback={null}>
          <TvSeasons tvId={Number(id)} onClose={() => setShowSeasons(false)} />
        </Suspense>
      )}
      {showGallery && id && mediaType && (
        <Suspense fallback={null}>
          <MediaGallery mediaId={Number(id)} mediaType={mediaType} onClose={() => setShowGallery(false)} />
        </Suspense>
      )}
      {/* Actor Modal Removed in favor of dedicated page */}

      <Suspense fallback={null}>
        <WatchProvidersDialog
          open={showWatchProviders}
          onOpenChange={setShowWatchProviders}
          title={title || ""}
          media={media}
        />
      </Suspense>

      {/* Main Content */}
      <main className="max-w-screen-xl mx-auto px-4 md:px-8 -mt-32 lg:-mt-64 relative z-10">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Poster */}
          <div className="w-full lg:w-1/4 flex-shrink-0">
            <div className="rounded-lg overflow-hidden border-2 border-muted/20 shadow-xl">
              <OptimizedImage src={posterUrl} alt={title || ""} className="w-full aspect-[2/3] object-cover" loading="lazy" />
            </div>
          </div>

          {/* Details */}
          <div className="w-full lg:w-3/4">
            <MediaInfo
              media={media}
              title={title || ""}
              releaseYear={releaseYear}
              releaseDate={releaseDate}
              runtimeString={getRuntimeString()}
              nextTrailerAverage={ratingSummary.average}
              nextTrailerCount={ratingSummary.count}
            />

            {mediaType && id && (
              <MediaActions
                onWatchNow={handleWatchNow}
                onPlayTrailer={handlePlayTrailer}
                onShowReviews={handleShowReviews}
                onShowComments={handleShowComments}
                onShowSeasons={handleShowSeasons}
                onAddToWatchlist={handleAddToWatchlist}
                onToggleLibrary={handleToggleLibrary}
                onMarkWatched={handleMarkWatched}
                onShare={handleShare}
                onShowGallery={handleShowGallery}
                onShowTrivia={handleShowTrivia}
                mediaType={mediaType}
                isInWatchlist={isInWatchlist(Number(id), mediaType)}
                isInLibrary={!!getItem(Number(id), mediaType)}
                isLoggedIn={canAccess}
              />
            )}

            {mediaType === "tv" && (
              <div className="mb-8 space-y-6">
                <div className="bg-secondary/20 rounded-lg p-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {tvInfoItems.map((item) => (
                      <div key={item.label} className="text-sm">
                        <div className="text-muted-foreground">{item.label}</div>
                        <div className="font-semibold">{item.value}</div>
                      </div>
                    ))}
                  </div>
                </div>
                <Suspense fallback={null}>
                  <TvSeasons tvId={Number(id)} variant="inline" />
                </Suspense>
              </div>
            )}

            {/* Overview */}
            <div className="mb-8">
              <h2 className="text-xl font-semibold mb-3">Panoramica</h2>
              <p className="text-muted-foreground">{media.overview}</p>
            </div>

            {/* AI Trivia */}
            <Suspense fallback={null}>
              <MediaTrivia
                trivia={trivia}
                showTrivia={showTrivia}
                onToggleTrivia={handleShowTrivia}
              />
            </Suspense>

            {/* Credits */}
            <div className="mb-8 mt-8">
              <h2 className="text-xl font-semibold mb-3">Crediti</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  {director && (
                    <div className="mb-2">
                      <span className="text-sm text-muted-foreground">Regista:</span>
                      <p>{director.name}</p>
                    </div>
                  )}
                  {(creators?.length ?? 0) > 0 && (
                    <div className="mb-2">
                      <span className="text-sm text-muted-foreground">Creato da:</span>
                      <p>{creators?.map(c => c.name).join(", ")}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Actors */}
            <div className="mb-8">
              <h2 className="text-xl font-semibold mb-3">Attori Protagonisti</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {mainCast.map(actor => (
                  <div key={actor.id} onClick={() => handleViewActorDetails(actor.id)} className="cursor-pointer transition-transform hover:scale-105">
                    <ActorCard actor={actor} />
                  </div>
                ))}
              </div>
            </div>

            <div ref={commentsRef} className="mb-8">
              <h2 className="text-xl font-semibold mb-4">Commenti e Voti</h2>
              <div className="flex flex-wrap items-center gap-4 mb-6">
                <div className="text-3xl font-semibold">{ratingSummary.average}</div>
                <div className="text-sm text-muted-foreground">
                  Media voto utenti NextTrailer{ratingSummary.count ? ` • ${ratingSummary.count} voti` : ""}
                </div>
                {isRatingsLoading && (
                  <div className="text-sm text-muted-foreground">Caricamento voti...</div>
                )}
              </div>

              {!isFirebaseEnabled && (
                <div className="text-sm text-muted-foreground">Firebase non configurato.</div>
              )}

              {isFirebaseEnabled && !canAccess && (
                <div className="text-sm text-muted-foreground">
                  Accedi per commentare e votare questo contenuto.
                </div>
              )}

              {isFirebaseEnabled && canAccess && (
                <div className="grid gap-6 mb-6">
                  <form onSubmit={handleSubmitRating} className="bg-secondary/10 rounded-lg p-4 border border-white/5">
                    <div className="flex flex-col sm:flex-row gap-4 items-end">
                      <div className="sm:w-48">
                        <label className="text-sm text-muted-foreground block mb-2">Il tuo voto</label>
                        <select
                          value={ratingValue || ""}
                          onChange={(event) => setRatingValue(Number(event.target.value))}
                          className="w-full bg-background border border-white/10 rounded-md px-3 py-2 text-sm"
                        >
                          <option value="">Seleziona</option>
                          {Array.from({ length: 10 }, (_, index) => 10 - index).map((value) => (
                            <option key={value} value={value}>{value}</option>
                          ))}
                        </select>
                      </div>
                      <div className="flex-1 text-sm text-muted-foreground">
                        {ratingValue > 0 ? `Il tuo voto attuale è ${ratingValue}` : "Non hai ancora votato."}
                      </div>
                      <Button type="submit" disabled={isSubmittingRating}>
                        {isSubmittingRating ? "Salvataggio..." : "Salva voto"}
                      </Button>
                    </div>
                    {ratingError && <div className="text-sm text-destructive mt-3">{ratingError}</div>}
                  </form>

                  <form onSubmit={handleSubmitComment} className="bg-secondary/10 rounded-lg p-4 border border-white/5">
                    <label className="text-sm text-muted-foreground block mb-2">Il tuo commento</label>
                    <textarea
                      value={commentText}
                      onChange={(event) => setCommentText(event.target.value)}
                      rows={3}
                      className="w-full bg-background border border-white/10 rounded-md px-3 py-2 text-sm resize-none"
                      placeholder="Scrivi un commento..."
                    />
                    {commentError && <div className="text-sm text-destructive mt-3">{commentError}</div>}
                    <div className="mt-4 flex justify-end">
                      <Button type="submit" disabled={isSubmittingComment}>
                        {isSubmittingComment ? "Invio in corso..." : "Pubblica"}
                      </Button>
                    </div>
                  </form>

                  <div className="bg-secondary/10 rounded-lg p-4 border border-white/5 space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="text-sm text-muted-foreground">Le tue liste</div>
                        <div className="text-lg font-semibold">Salva in lista</div>
                      </div>
                      {isListsLoading && (
                        <div className="text-sm text-muted-foreground">Caricamento liste...</div>
                      )}
                    </div>
                    {listError && <div className="text-sm text-destructive">{listError}</div>}
                    <div className="flex flex-col sm:flex-row gap-3">
                      <select
                        value={selectedListId}
                        onChange={(event) => setSelectedListId(event.target.value)}
                        className="w-full bg-background border border-white/10 rounded-md px-3 py-2 text-sm"
                      >
                        <option value="">Seleziona lista</option>
                        {userLists.map((list) => (
                          <option key={list.id} value={list.id}>{list.name}</option>
                        ))}
                      </select>
                      <Button type="button" disabled={isAddingToList} onClick={handleAddToList}>
                        {isAddingToList ? "Salvataggio..." : "Aggiungi"}
                      </Button>
                    </div>
                    <div className="border-t border-white/5 pt-4 space-y-3">
                      <div className="text-sm text-muted-foreground">Crea nuova lista</div>
                      <input
                        value={newListName}
                        onChange={(event) => setNewListName(event.target.value)}
                        placeholder="Nome lista"
                        className="w-full bg-background border border-white/10 rounded-md px-3 py-2 text-sm"
                      />
                      <textarea
                        value={newListDescription}
                        onChange={(event) => setNewListDescription(event.target.value)}
                        rows={2}
                        placeholder="Descrizione (opzionale)"
                        className="w-full bg-background border border-white/10 rounded-md px-3 py-2 text-sm resize-none"
                      />
                      <label className="flex items-center gap-2 text-sm text-muted-foreground">
                        <input
                          type="checkbox"
                          checked={isListPublic}
                          onChange={(event) => setIsListPublic(event.target.checked)}
                        />
                        Lista pubblica
                      </label>
                      <Button type="button" disabled={isCreatingList} onClick={handleCreateList}>
                        {isCreatingList ? "Creazione..." : "Crea lista"}
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {commentError && (
                <div className="text-sm text-destructive mb-3">{commentError}</div>
              )}
              <div className="space-y-4 max-h-80 overflow-y-auto rounded-lg border border-white/5 bg-secondary/5 p-4">
                {isCommentsLoading && (
                  <div className="text-sm text-muted-foreground">Caricamento commenti...</div>
                )}
                {!isCommentsLoading && comments.length === 0 && (
                  <div className="text-sm text-muted-foreground">Nessun commento disponibile.</div>
                )}
                {!isCommentsLoading && comments.map((comment) => (
                  <div key={comment.id} className="border border-white/5 rounded-lg p-4 bg-background/60">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="font-semibold">{comment.userName}</div>
                      <div className="text-sm text-muted-foreground flex items-center gap-3">
                        {comment.createdAt && <span>{formatCommentDate(comment.createdAt)}</span>}
                        {isSuperAdmin && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteComment(comment.id)}
                            disabled={isDeletingCommentId === comment.id}
                          >
                            {isDeletingCommentId === comment.id ? "Rimozione..." : "Rimuovi"}
                          </Button>
                        )}
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">{comment.text}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Gallery Preview Button Section (Moved to Actions or kept here? The original had a dedicated section) */}
        <div className="mt-12">
          <h2 className="text-2xl font-bold mb-6 flex items-center">
            <ImageIcon className="mr-2" />
            Poster e Immagini
          </h2>
          <div className="flex flex-nowrap overflow-x-auto gap-4 pb-4">
            <Button variant="outline" className="h-auto p-2" onClick={handleShowGallery}>
              <div className="w-40 h-24 rounded bg-secondary/20 flex items-center justify-center">
                <ImageIcon className="h-8 w-8 opacity-50" />
              </div>
              <p className="mt-2 text-sm">Vedi Galleria</p>
            </Button>
          </div>
        </div>

        {/* Trailers section */}
        {trailers && trailers.length > 0 && (
          <div className="mt-12">
            <h2 className="text-2xl font-bold mb-6 flex items-center">
              <Film className="mr-2" />
              Trailer e Video
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {trailers.slice(0, 2).map((trailer) => (
                <div key={trailer.id} className="aspect-video bg-black rounded-lg overflow-hidden">
                  <iframe
                    width="100%"
                    height="100%"
                    src={`https://www.youtube.com/embed/${trailer.key}`}
                    title={trailer.name}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    className="w-full h-full"
                  ></iframe>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Similar content */}
        {similarContent.length > 0 && (
          <div className="mt-12">
            <ContentRow title={`Contenuti simili a ${title}`} items={similarContent} />
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default MediaDetailsPage;
