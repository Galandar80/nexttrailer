"use client";

import { useCallback, useEffect, useMemo, useState, type ChangeEvent } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/auth-core";
import { getDb, getFirestoreModule, getStorage, getStorageModule, isFirebaseEnabled } from "@/services/firebase";
import { API_URL, fetchWithAccessToken, fetchWithRetry } from "@/services/api/config";
import { tmdbApi } from "@/services/tmdbApi";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { OptimizedImage } from "@/components/OptimizedImage";

type NewsArticle = {
  id: string;
  publicId?: string;
  title: string;
  subtitle: string;
  body: string;
  bullets: string[];
  imageUrl?: string;
  sourceUrl: string;
  sourceTitle: string;
  publishedAt: string;
  publishedAtTs: number;
  collection: "news_articles" | "news_comingsoon";
};

type TmdbResult = {
  id: number;
  media_type: "movie" | "tv";
  title?: string;
  name?: string;
  release_date?: string;
  first_air_date?: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
};

type TmdbImage = {
  file_path: string;
  width: number;
  height: number;
};

const STORAGE_KEY = "news-articles";
const COMINGSOON_STORAGE_KEY = "comingsoon-articles";
const loadFirestore = async () => {
  if (!isFirebaseEnabled) return null;
  const [db, firestore] = await Promise.all([getDb(), getFirestoreModule()]);
  if (!db) return null;
  return { db, ...firestore };
};
const loadStorage = async () => {
  if (!isFirebaseEnabled) return null;
  const [storage, storageModule] = await Promise.all([getStorage(), getStorageModule()]);
  if (!storage) return null;
  return { storage, ...storageModule };
};
const toPublicId = (value: string) => {
  let hash1 = 0;
  let hash2 = 0;
  for (let i = 0; i < value.length; i += 1) {
    const code = value.charCodeAt(i);
    hash1 = (hash1 << 5) - hash1 + code;
    hash1 |= 0;
    hash2 = (hash2 << 7) - hash2 + code;
    hash2 |= 0;
  }
  return `n${Math.abs(hash1).toString(36)}${Math.abs(hash2).toString(36)}`;
};

const fetchTmdbImages = async (mediaType: "movie" | "tv", id: number) => {
  const endpoint = `/${mediaType}/${id}/images?include_image_language=it,en,null`;
  try {
    const url = `${API_URL}${endpoint}`;
    const response = await fetchWithRetry(url);
    const data = await response.json();
    return {
      posters: (data.posters || []) as TmdbImage[],
      backdrops: (data.backdrops || []) as TmdbImage[]
    };
  } catch {
    const response = await fetchWithAccessToken(endpoint);
    const data = await response.json();
    return {
      posters: (data.posters || []) as TmdbImage[],
      backdrops: (data.backdrops || []) as TmdbImage[]
    };
  }
};


const parseStored = (value: string | null) => {
  if (!value) return [] as NewsArticle[];
  try {
    return JSON.parse(value) as NewsArticle[];
  } catch {
    return [];
  }
};

const NewsAdmin = () => {
  const { toast } = useToast();
  const { user, canAccess } = useAuth();
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [activeArticle, setActiveArticle] = useState<NewsArticle | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editSubtitle, setEditSubtitle] = useState("");
  const [editBody, setEditBody] = useState("");
  const [editBullets, setEditBullets] = useState("");
  const [editImageUrl, setEditImageUrl] = useState("");
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [tmdbQuery, setTmdbQuery] = useState("");
  const [tmdbResults, setTmdbResults] = useState<TmdbResult[]>([]);
  const [isSearchingTmdb, setIsSearchingTmdb] = useState(false);
  const [tmdbHasSearched, setTmdbHasSearched] = useState(false);
  const [galleryItemId, setGalleryItemId] = useState<string | null>(null);
  const [galleryPosters, setGalleryPosters] = useState<TmdbImage[]>([]);
  const [galleryBackdrops, setGalleryBackdrops] = useState<TmdbImage[]>([]);
  const [isGalleryLoading, setIsGalleryLoading] = useState(false);
  const [isBackfillingIds, setIsBackfillingIds] = useState(false);
  const isSuperAdmin = user?.email?.toLowerCase() === "calisma82@gmail.com";

  const handleDelete = async (id: string, targetCollection: NewsArticle["collection"]) => {
    const firestore = await loadFirestore();
    if (!firestore) {
      toast({ title: "Firebase non configurato", variant: "destructive" });
      return;
    }
    try {
      const { db, deleteDoc, doc } = firestore;
      await deleteDoc(doc(db, targetCollection, id));
      setArticles((prev) => prev.filter((item) => item.id !== id || item.collection !== targetCollection));
      const storageKey = targetCollection === "news_comingsoon" ? COMINGSOON_STORAGE_KEY : STORAGE_KEY;
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const cached = JSON.parse(stored) as NewsArticle[];
        const updated = cached.filter((item) => item.id !== id);
        localStorage.setItem(storageKey, JSON.stringify(updated));
      }
      toast({ title: "News eliminata" });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Errore eliminazione";
      toast({ title: message, variant: "destructive" });
    }
  };

  const loadArticles = useCallback(async () => {
    const firestore = await loadFirestore();
    if (!firestore) {
      setError("Firebase non configurato");
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const { db, collection, getDocs, limit, orderBy, query } = firestore;
      const newsQuery = query(collection(db, "news_articles"), orderBy("publishedAtTs", "desc"), limit(200));
      const topQuery = query(collection(db, "news_comingsoon"), orderBy("publishedAtTs", "desc"), limit(200));
      const [newsSnapshot, topSnapshot] = await Promise.all([getDocs(newsQuery), getDocs(topQuery)]);
      const newsFetched = newsSnapshot.docs.map((entry) => {
        const data = entry.data() as NewsArticle;
        return { ...data, id: data.id || entry.id, collection: "news_articles" as const };
      });
      const topFetched = topSnapshot.docs.map((entry) => {
        const data = entry.data() as NewsArticle;
        return { ...data, id: data.id || entry.id, collection: "news_comingsoon" as const };
      });
      setArticles([...topFetched, ...newsFetched]);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Errore lettura news";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user && canAccess && isSuperAdmin) {
      loadArticles();
    }
  }, [user, canAccess, isSuperAdmin, loadArticles]);

  const handleBackfillPublicIds = async () => {
    const firestore = await loadFirestore();
    if (!firestore) {
      toast({ title: "Firebase non configurato", variant: "destructive" });
      return;
    }
    setIsBackfillingIds(true);
    try {
      const { db, collection, doc, getDocs, limit, orderBy, query, setDoc } = firestore;
      const backfillCollection = async (collectionName: NewsArticle["collection"]) => {
        const snapshot = await getDocs(query(collection(db, collectionName), orderBy("publishedAtTs", "desc"), limit(500)));
        let updated = 0;
        for (const entry of snapshot.docs) {
          const data = entry.data() as NewsArticle;
          if (data.publicId || !data.sourceUrl) continue;
          const publicId = toPublicId(data.sourceUrl);
          await setDoc(doc(db, collectionName, entry.id), { publicId }, { merge: true });
          updated += 1;
        }
        return updated;
      };
      const [updatedTop, updatedNews] = await Promise.all([
        backfillCollection("news_comingsoon"),
        backfillCollection("news_articles")
      ]);
      setArticles((prev) =>
        prev.map((item) =>
          item.publicId || !item.sourceUrl ? item : { ...item, publicId: toPublicId(item.sourceUrl) }
        )
      );
      toast({ title: `Public ID aggiornati: ${updatedTop + updatedNews}` });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Errore aggiornamento Public ID";
      toast({ title: message, variant: "destructive" });
    } finally {
      setIsBackfillingIds(false);
    }
  };

  const openEdit = (article: NewsArticle) => {
    setActiveArticle(article);
    setEditTitle(article.title);
    setEditSubtitle(article.subtitle || "");
    setEditBody(article.body);
    setEditBullets(article.bullets.join("\n"));
    setEditImageUrl(article.imageUrl || "");
    setTmdbQuery(article.sourceTitle || article.title);
    setTmdbResults([]);
    setTmdbHasSearched(false);
    setGalleryItemId(null);
    setGalleryPosters([]);
    setGalleryBackdrops([]);
    setIsEditOpen(true);
  };

  const normalizedBullets = useMemo(() => {
    return editBullets
      .split("\n")
      .map((bullet) => bullet.trim())
      .filter(Boolean);
  }, [editBullets]);

  const topArticles = useMemo(
    () => articles.filter((article) => article.collection === "news_comingsoon"),
    [articles]
  );

  const standardArticles = useMemo(
    () => articles.filter((article) => article.collection === "news_articles"),
    [articles]
  );

  const moveArticle = async (article: NewsArticle, targetCollection: NewsArticle["collection"]) => {
    const firestore = await loadFirestore();
    if (!firestore) {
      toast({ title: "Firebase non configurato", variant: "destructive" });
      return;
    }
    try {
      const { db, deleteDoc, doc, setDoc } = firestore;
      const { collection: sourceCollection, ...rest } = article;
      if (sourceCollection === targetCollection) return;
      await setDoc(doc(db, targetCollection, article.id), rest);
      await deleteDoc(doc(db, sourceCollection, article.id));
      setArticles((prev) =>
        prev.map((item) =>
          item.id === article.id && item.collection === sourceCollection
            ? { ...item, collection: targetCollection }
            : item
        )
      );
      const sourceKey = sourceCollection === "news_comingsoon" ? COMINGSOON_STORAGE_KEY : STORAGE_KEY;
      const targetKey = targetCollection === "news_comingsoon" ? COMINGSOON_STORAGE_KEY : STORAGE_KEY;
      const sourceStored = parseStored(localStorage.getItem(sourceKey));
      const targetStored = parseStored(localStorage.getItem(targetKey));
      const updatedSource = sourceStored.filter((item) => item.id !== article.id);
      const updatedTarget = [
        rest,
        ...targetStored.filter((item) => item.id !== article.id)
      ];
      localStorage.setItem(sourceKey, JSON.stringify(updatedSource));
      localStorage.setItem(targetKey, JSON.stringify(updatedTarget));
      toast({ title: targetCollection === "news_comingsoon" ? "Spostato in evidenza" : "Spostato tra gli standard" });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Errore spostamento";
      toast({ title: message, variant: "destructive" });
    }
  };

  const handleImageUpload = async (file: File) => {
    const storageDeps = await loadStorage();
    if (!storageDeps) {
      toast({ title: "Firebase Storage non configurato", variant: "destructive" });
      return;
    }
    if (!activeArticle) return;
    setIsUploadingImage(true);
    try {
      const safeName = `${activeArticle.id}-${Date.now()}-${file.name}`.replace(/\s+/g, "-");
      const { storage, ref, uploadBytes, getDownloadURL } = storageDeps;
      const imageRef = ref(storage, `news-images/${safeName}`);
      await uploadBytes(imageRef, file);
      const url = await getDownloadURL(imageRef);
      setEditImageUrl(url);
      toast({ title: "Immagine caricata" });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Errore upload immagine";
      toast({ title: message, variant: "destructive" });
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleImageFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    await handleImageUpload(file);
    event.target.value = "";
  };

  const handleSearchTmdb = async () => {
    const queryText = tmdbQuery.trim() || activeArticle?.sourceTitle || "";
    if (!queryText) {
      toast({ title: "Inserisci una query per la ricerca TMDB", variant: "destructive" });
      return;
    }
    setIsSearchingTmdb(true);
    setTmdbHasSearched(false);
    try {
      const { results } = await tmdbApi.search(queryText, 1, { includePeople: false });
      const combined = results
        .filter((item): item is typeof item & { media_type: "movie" | "tv" } =>
          item.media_type === "movie" || item.media_type === "tv"
        )
        .map((item) => ({
          id: item.id,
          media_type: item.media_type,
          title: "title" in item ? item.title : undefined,
          name: "name" in item ? item.name : undefined,
          release_date: "release_date" in item ? item.release_date : undefined,
          first_air_date: "first_air_date" in item ? item.first_air_date : undefined,
          poster_path: "poster_path" in item ? item.poster_path : undefined,
          backdrop_path: "backdrop_path" in item ? item.backdrop_path : undefined
        }));
      setTmdbResults(combined.slice(0, 12));
      setTmdbHasSearched(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Errore ricerca TMDB";
      toast({ title: message, variant: "destructive" });
      setTmdbHasSearched(true);
    } finally {
      setIsSearchingTmdb(false);
    }
  };

  const handleToggleGallery = async (item: TmdbResult) => {
    const key = `${item.media_type}-${item.id}`;
    if (galleryItemId === key) {
      setGalleryItemId(null);
      return;
    }
    setGalleryItemId(key);
    setGalleryPosters([]);
    setGalleryBackdrops([]);
    setIsGalleryLoading(true);
    try {
      const images = await fetchTmdbImages(item.media_type, item.id);
      setGalleryPosters(images.posters.slice(0, 24));
      setGalleryBackdrops(images.backdrops.slice(0, 24));
      if (images.posters.length === 0 && images.backdrops.length === 0) {
        toast({ title: "Nessuna immagine disponibile", variant: "destructive" });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Errore caricamento immagini";
      toast({ title: message, variant: "destructive" });
      setGalleryPosters([]);
      setGalleryBackdrops([]);
    } finally {
      setIsGalleryLoading(false);
    }
  };

  const handlePickTmdbImage = (imagePath: string) => {
    if (!imagePath) {
      toast({ title: "Immagine non disponibile", variant: "destructive" });
      return;
    }
    const url = `https://image.tmdb.org/t/p/w780${imagePath}`;
    setEditImageUrl(url);
  };

  const handleSave = async () => {
    if (!activeArticle) return;
    if (!editTitle.trim() || !editBody.trim()) {
      toast({ title: "Titolo e testo sono obbligatori", variant: "destructive" });
      return;
    }
    const firestore = await loadFirestore();
    if (!firestore) {
      toast({ title: "Firebase non configurato", variant: "destructive" });
      return;
    }
    try {
      const { db, doc, updateDoc } = firestore;
      const docRef = doc(db, activeArticle.collection, activeArticle.id);
      const trimmedImageUrl = editImageUrl.trim();
      const payload = {
        title: editTitle.trim(),
        subtitle: editSubtitle.trim(),
        body: editBody.trim(),
        bullets: normalizedBullets,
        imageUrl: trimmedImageUrl
      };
      await updateDoc(docRef, payload);
      setArticles((prev) =>
        prev.map((item) => (item.id === activeArticle.id ? { ...item, ...payload } : item))
      );
      const storageKey = activeArticle.collection === "news_comingsoon" ? COMINGSOON_STORAGE_KEY : STORAGE_KEY;
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const cached = JSON.parse(stored) as NewsArticle[];
        const updated = cached.map((item) => (item.id === activeArticle.id ? { ...item, ...payload } : item));
        localStorage.setItem(storageKey, JSON.stringify(updated));
      }
      toast({ title: "Articolo aggiornato" });
      setIsEditOpen(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Errore salvataggio";
      toast({ title: message, variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SEO title="Gestione News" description="Gestione news" robots="noindex, nofollow" />
      <Navbar />

      <main className="max-w-screen-xl mx-auto px-4 md:px-8 py-8 space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold">Gestione News</h1>
            <p className="text-muted-foreground">Gestisci gli articoli pubblicati.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button asChild variant="outline">
              <Link href="/news">Torna alle news</Link>
            </Button>
            <Button onClick={loadArticles} disabled={isLoading}>
              {isLoading ? "Aggiornamento..." : "Aggiorna elenco"}
            </Button>
            {isSuperAdmin && (
              <Button variant="outline" onClick={handleBackfillPublicIds} disabled={isBackfillingIds}>
                {isBackfillingIds ? "Aggiornamento ID..." : "Rigenera ID pubblici"}
              </Button>
            )}
          </div>
        </div>

        {!user && (
          <div className="text-muted-foreground">Accedi per gestire le news.</div>
        )}

        {user && !canAccess && (
          <div className="text-muted-foreground">Completa la verifica email per gestire le news.</div>
        )}

        {user && canAccess && !isSuperAdmin && (
          <div className="text-muted-foreground">Non hai i permessi per gestire le news.</div>
        )}

        {error && (
          <div className="text-sm text-red-500">{error}</div>
        )}

        {user && canAccess && isSuperAdmin && (
          <div className="grid gap-8">
            {articles.length === 0 && !isLoading ? (
              <div className="text-muted-foreground">Nessuna news disponibile.</div>
            ) : (
              <>
                <section className="grid gap-4">
                  <h2 className="text-lg font-semibold">Articoli in evidenza</h2>
                  {topArticles.length === 0 ? (
                    <div className="text-muted-foreground">Nessun articolo in evidenza.</div>
                  ) : (
                    topArticles.map((article) => (
                      <div key={article.id} className="bg-secondary/20 rounded-2xl p-5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div className="space-y-2">
                          <h3 className="text-lg font-semibold">{article.title}</h3>
                          {article.publishedAt && (
                            <p className="text-xs text-muted-foreground">
                              {new Date(article.publishedAt).toLocaleDateString("it-IT", { day: "2-digit", month: "long", year: "numeric" })}
                            </p>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Button onClick={() => openEdit(article)}>Modifica</Button>
                        <Button variant="outline" onClick={() => moveArticle(article, "news_articles")}>
                          Rimuovi da evidenza
                        </Button>
                          <Button variant="destructive" onClick={() => handleDelete(article.id, article.collection)}>
                            Elimina
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </section>
                <section className="grid gap-4">
                  <h2 className="text-lg font-semibold">Articoli standard</h2>
                  {standardArticles.length === 0 ? (
                    <div className="text-muted-foreground">Nessun articolo standard.</div>
                  ) : (
                    standardArticles.map((article) => (
                      <div key={article.id} className="bg-secondary/20 rounded-2xl p-5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div className="space-y-2">
                          <h3 className="text-lg font-semibold">{article.title}</h3>
                          {article.publishedAt && (
                            <p className="text-xs text-muted-foreground">
                              {new Date(article.publishedAt).toLocaleDateString("it-IT", { day: "2-digit", month: "long", year: "numeric" })}
                            </p>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Button onClick={() => openEdit(article)}>Modifica</Button>
                        <Button variant="outline" onClick={() => moveArticle(article, "news_comingsoon")}>
                          Metti in evidenza
                        </Button>
                          <Button variant="destructive" onClick={() => handleDelete(article.id, article.collection)}>
                            Elimina
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </section>
              </>
            )}
          </div>
        )}
      </main>

      <Footer />

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-h-[90vh] w-[calc(100%-1.5rem)] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Modifica articolo</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="news-title">Titolo</Label>
              <Input id="news-title" value={editTitle} onChange={(event) => setEditTitle(event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="news-subtitle">Sottotitolo</Label>
              <Input id="news-subtitle" value={editSubtitle} onChange={(event) => setEditSubtitle(event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="news-body">Testo</Label>
              <Textarea id="news-body" value={editBody} onChange={(event) => setEditBody(event.target.value)} rows={10} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="news-bullets">Punti chiave (uno per riga)</Label>
              <Textarea
                id="news-bullets"
                value={editBullets}
                onChange={(event) => setEditBullets(event.target.value)}
                rows={4}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="news-image-url">Immagine (link)</Label>
              <Input
                id="news-image-url"
                value={editImageUrl}
                onChange={(event) => setEditImageUrl(event.target.value)}
                placeholder="https://..."
              />
            </div>
            <div className="space-y-3">
              <Label htmlFor="tmdb-search">Cerca nel catalogo TMDB</Label>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input
                  id="tmdb-search"
                  value={tmdbQuery}
                  onChange={(event) => setTmdbQuery(event.target.value)}
                  placeholder="Titolo film o serie"
                />
                <Button
                  variant="outline"
                  onClick={handleSearchTmdb}
                  disabled={isSearchingTmdb}
                >
                  {isSearchingTmdb ? "Ricerca..." : "Cerca"}
                </Button>
              </div>
              {tmdbResults.length > 0 && (
                <div className="grid gap-3 sm:grid-cols-2">
                  {tmdbResults.map((item) => {
                    const title = item.title || item.name || "";
                    const date = item.release_date || item.first_air_date || "";
                    const year = date ? date.slice(0, 4) : "";
                    const posterUrl = item.poster_path ? `https://image.tmdb.org/t/p/w342${item.poster_path}` : "";
                    const backdropUrl = item.backdrop_path ? `https://image.tmdb.org/t/p/w300${item.backdrop_path}` : "";
                    const itemKey = `${item.media_type}-${item.id}`;
                    const isGalleryOpen = galleryItemId === itemKey;
                    return (
                      <div
                        key={itemKey}
                        className="rounded-xl border border-border p-3"
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex-1">
                            <p className="text-sm font-semibold">{title}</p>
                            <p className="text-xs text-muted-foreground">
                              {item.media_type === "movie" ? "Film" : "Serie TV"}{year ? ` • ${year}` : ""}
                            </p>
                          </div>
                        </div>
                        <div className="mt-3 grid gap-2 sm:grid-cols-2">
                          <button
                            type="button"
                            onClick={() => handlePickTmdbImage(item.poster_path || "")}
                            className="flex items-center gap-2 rounded-lg border border-border p-2 text-left hover:bg-secondary/30 disabled:opacity-60"
                            disabled={!item.poster_path}
                          >
                            {posterUrl ? (
                              <OptimizedImage
                                src={posterUrl}
                                alt={`${title} poster`}
                                className="h-16 w-12 rounded-md object-cover"
                                loading="lazy"
                              />
                            ) : (
                              <div className="h-16 w-12 rounded-md bg-secondary/40" />
                            )}
                            <span className="text-xs text-muted-foreground">Poster</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handlePickTmdbImage(item.backdrop_path || "")}
                            className="flex items-center gap-2 rounded-lg border border-border p-2 text-left hover:bg-secondary/30 disabled:opacity-60"
                            disabled={!item.backdrop_path}
                          >
                            {backdropUrl ? (
                              <OptimizedImage
                                src={backdropUrl}
                                alt={`${title} backdrop`}
                                className="h-16 w-24 rounded-md object-cover"
                                loading="lazy"
                              />
                            ) : (
                              <div className="h-16 w-24 rounded-md bg-secondary/40" />
                            )}
                            <span className="text-xs text-muted-foreground">Backdrop</span>
                          </button>
                        </div>
                        <Button
                          variant="outline"
                          className="mt-3 w-full"
                          onClick={() => handleToggleGallery(item)}
                        >
                          {isGalleryOpen ? "Chiudi galleria" : "Galleria completa"}
                        </Button>
                        {isGalleryOpen && (
                          <div className="mt-4 space-y-4">
                            {isGalleryLoading ? (
                              <div className="text-sm text-muted-foreground">Caricamento immagini...</div>
                            ) : (
                              <>
                                {galleryPosters.length > 0 && (
                                  <div className="space-y-2">
                                    <p className="text-xs font-semibold text-muted-foreground">Poster</p>
                                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                                      {galleryPosters.map((image) => (
                                        <button
                                          key={`poster-${image.file_path}`}
                                          type="button"
                                          onClick={() => handlePickTmdbImage(image.file_path)}
                                          className="overflow-hidden rounded-lg border border-border hover:bg-secondary/30"
                                        >
                                          <OptimizedImage
                                            src={`https://image.tmdb.org/t/p/w342${image.file_path}`}
                                            alt={`${title} poster`}
                                            className="h-32 w-full object-cover"
                                            loading="lazy"
                                          />
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                {galleryBackdrops.length > 0 && (
                                  <div className="space-y-2">
                                    <p className="text-xs font-semibold text-muted-foreground">Backdrop</p>
                                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                      {galleryBackdrops.map((image) => (
                                        <button
                                          key={`backdrop-${image.file_path}`}
                                          type="button"
                                          onClick={() => handlePickTmdbImage(image.file_path)}
                                          className="overflow-hidden rounded-lg border border-border hover:bg-secondary/30"
                                        >
                                          <OptimizedImage
                                            src={`https://image.tmdb.org/t/p/w780${image.file_path}`}
                                            alt={`${title} backdrop`}
                                            className="h-32 w-full object-cover"
                                            loading="lazy"
                                          />
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
              {tmdbHasSearched && tmdbResults.length === 0 && (
                <p className="text-sm text-muted-foreground">Nessun risultato per questa ricerca.</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="news-image-upload">Immagine (upload)</Label>
              <Input
                id="news-image-upload"
                type="file"
                accept="image/*"
                onChange={handleImageFileChange}
                disabled={isUploadingImage}
              />
              {editImageUrl && (
                <OptimizedImage
                  src={editImageUrl}
                  alt={editTitle || "Immagine articolo"}
                  className="w-full max-w-md rounded-lg border border-border"
                  loading="lazy"
                />
              )}
            </div>
            <div className="flex flex-wrap gap-3 justify-end">
              <Button variant="outline" onClick={() => setIsEditOpen(false)}>
                Annulla
              </Button>
              <Button className="bg-accent hover:bg-accent/90" onClick={handleSave} disabled={isUploadingImage}>
                {isUploadingImage ? "Caricamento..." : "Salva modifiche"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default NewsAdmin;
