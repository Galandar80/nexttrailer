import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { collection, deleteDoc, doc, getDocs, limit, orderBy, query, updateDoc } from "firebase/firestore";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/auth-core";
import { db, isFirebaseEnabled } from "@/services/firebase";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

type NewsArticle = {
  id: string;
  title: string;
  subtitle: string;
  body: string;
  bullets: string[];
  imageUrl?: string;
  sourceUrl: string;
  sourceTitle: string;
  publishedAt: string;
  publishedAtTs: number;
};

const STORAGE_KEY = "news-articles";

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
  const isSuperAdmin = user?.email?.toLowerCase() === "calisma82@gmail.com";

  const loadArticles = useCallback(async () => {
    if (!isFirebaseEnabled || !db) {
      setError("Firebase non configurato");
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const newsQuery = query(collection(db, "news_articles"), orderBy("publishedAtTs", "desc"), limit(200));
      const snapshot = await getDocs(newsQuery);
      const fetched = snapshot.docs.map((entry) => {
        const data = entry.data() as NewsArticle;
        return { ...data, id: data.id || entry.id };
      });
      setArticles(fetched);
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

  const handleDelete = async (id: string) => {
    if (!isFirebaseEnabled || !db) {
      toast({ title: "Firebase non configurato", variant: "destructive" });
      return;
    }
    try {
      await deleteDoc(doc(db, "news_articles", id));
      setArticles((prev) => prev.filter((item) => item.id !== id));
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const cached = JSON.parse(stored) as NewsArticle[];
        const updated = cached.filter((item) => item.id !== id);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      }
      toast({ title: "News eliminata" });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Errore eliminazione";
      toast({ title: message, variant: "destructive" });
    }
  };

  const openEdit = (article: NewsArticle) => {
    setActiveArticle(article);
    setEditTitle(article.title);
    setEditSubtitle(article.subtitle || "");
    setEditBody(article.body);
    setEditBullets(article.bullets.join("\n"));
    setIsEditOpen(true);
  };

  const normalizedBullets = useMemo(() => {
    return editBullets
      .split("\n")
      .map((bullet) => bullet.trim())
      .filter(Boolean);
  }, [editBullets]);

  const handleSave = async () => {
    if (!activeArticle) return;
    if (!editTitle.trim() || !editBody.trim()) {
      toast({ title: "Titolo e testo sono obbligatori", variant: "destructive" });
      return;
    }
    if (!isFirebaseEnabled || !db) {
      toast({ title: "Firebase non configurato", variant: "destructive" });
      return;
    }
    try {
      const docRef = doc(db, "news_articles", activeArticle.id);
      const payload = {
        title: editTitle.trim(),
        subtitle: editSubtitle.trim(),
        body: editBody.trim(),
        bullets: normalizedBullets
      };
      await updateDoc(docRef, payload);
      setArticles((prev) =>
        prev.map((item) => (item.id === activeArticle.id ? { ...item, ...payload } : item))
      );
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const cached = JSON.parse(stored) as NewsArticle[];
        const updated = cached.map((item) => (item.id === activeArticle.id ? { ...item, ...payload } : item));
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
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
      <SEO title="Gestione News" description="Gestione news" />
      <Navbar />

      <main className="max-w-screen-xl mx-auto px-4 md:px-8 py-8 space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold">Gestione News</h1>
            <p className="text-muted-foreground">Gestisci gli articoli pubblicati.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button asChild variant="outline">
              <Link to="/news">Torna alle news</Link>
            </Button>
            <Button onClick={loadArticles} disabled={isLoading}>
              {isLoading ? "Aggiornamento..." : "Aggiorna elenco"}
            </Button>
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
          <div className="grid gap-4">
            {articles.length === 0 && !isLoading ? (
              <div className="text-muted-foreground">Nessuna news disponibile.</div>
            ) : (
              articles.map((article) => (
                <div key={article.id} className="bg-secondary/20 rounded-2xl p-5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div className="space-y-2">
                    <h2 className="text-lg font-semibold">{article.title}</h2>
                    {article.publishedAt && (
                      <p className="text-xs text-muted-foreground">
                        {new Date(article.publishedAt).toLocaleDateString("it-IT", { day: "2-digit", month: "long", year: "numeric" })}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button onClick={() => openEdit(article)}>Modifica</Button>
                    <Button variant="destructive" onClick={() => handleDelete(article.id)}>
                      Elimina
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </main>

      <Footer />

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-2xl">
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
            <div className="flex flex-wrap gap-3 justify-end">
              <Button variant="outline" onClick={() => setIsEditOpen(false)}>
                Annulla
              </Button>
              <Button className="bg-accent hover:bg-accent/90" onClick={handleSave}>
                Salva modifiche
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default NewsAdmin;
