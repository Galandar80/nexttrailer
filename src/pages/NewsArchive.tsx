import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { collection, getDocs, limit, orderBy, query } from "firebase/firestore";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { db, isFirebaseEnabled } from "@/services/firebase";

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
const COMINGSOON_STORAGE_KEY = "comingsoon-articles";
const PAGE_SIZE = 18;
const MAX_ARCHIVE = 200;
const toDocId = (value: string) => encodeURIComponent(value);

const parseStoredArticles = (value: string | null) => {
  if (!value) return [] as NewsArticle[];
  try {
    return JSON.parse(value) as NewsArticle[];
  } catch {
    return [];
  }
};

const normalizeStoredArticles = (items: NewsArticle[]) => {
  return items.map((item) => {
    if (item.id) return item;
    const derivedId = item.sourceUrl ? toDocId(item.sourceUrl) : "";
    return { ...item, id: derivedId };
  }).filter((item) => item.id);
};

const isWikipediaImage = (url?: string) => {
  if (!url) return false;
  return url.includes("wikipedia.org") || url.includes("wikimedia.org");
};

const stripWikipediaImages = (items: NewsArticle[]) => {
  return items.map((item) => (isWikipediaImage(item.imageUrl) ? { ...item, imageUrl: "" } : item));
};

const NewsArchive = () => {
  const { toast } = useToast();
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [localAllArticles, setLocalAllArticles] = useState<NewsArticle[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [monthFilter, setMonthFilter] = useState("");

  const loadInitialArticles = useCallback(async () => {
    const storedNews = stripWikipediaImages(
      normalizeStoredArticles(parseStoredArticles(localStorage.getItem(STORAGE_KEY)))
    );
    const storedComing = stripWikipediaImages(
      normalizeStoredArticles(parseStoredArticles(localStorage.getItem(COMINGSOON_STORAGE_KEY)))
    );
    const stored = [...storedNews, ...storedComing];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(storedNews));
    localStorage.setItem(COMINGSOON_STORAGE_KEY, JSON.stringify(storedComing));
    setIsLoading(true);
    if (!isFirebaseEnabled || !db) {
      const sorted = [...stored].sort((a, b) => b.publishedAtTs - a.publishedAtTs);
      setLocalAllArticles(sorted);
      setArticles(sorted.slice(0, PAGE_SIZE));
      setHasMore(sorted.length > PAGE_SIZE);
      setIsLoading(false);
      return;
    }
    try {
      const [newsSnapshot, comingSnapshot] = await Promise.all([
        getDocs(query(collection(db, "news_articles"), orderBy("publishedAtTs", "desc"), limit(MAX_ARCHIVE))),
        getDocs(query(collection(db, "news_comingsoon"), orderBy("publishedAtTs", "desc"), limit(MAX_ARCHIVE)))
      ]);
      const fetchedNews = stripWikipediaImages(newsSnapshot.docs.map((entry) => {
        const data = entry.data() as NewsArticle;
        return { ...data, id: data.id || entry.id };
      }));
      const fetchedComing = stripWikipediaImages(comingSnapshot.docs.map((entry) => {
        const data = entry.data() as NewsArticle;
        return { ...data, id: data.id || entry.id };
      }));
      const fetchedNewsIds = new Set(fetchedNews.map((item) => item.id));
      const fetchedComingIds = new Set(fetchedComing.map((item) => item.id));
      const mergedNews = stripWikipediaImages([...fetchedNews, ...storedNews.filter((item) => !fetchedNewsIds.has(item.id))]);
      const mergedComing = stripWikipediaImages([...fetchedComing, ...storedComing.filter((item) => !fetchedComingIds.has(item.id))]);
      const merged = stripWikipediaImages([...mergedNews, ...mergedComing]).sort((a, b) => b.publishedAtTs - a.publishedAtTs);
      setArticles(merged.slice(0, PAGE_SIZE));
      setLocalAllArticles(merged);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(mergedNews));
      localStorage.setItem(COMINGSOON_STORAGE_KEY, JSON.stringify(mergedComing));
      setHasMore(merged.length > PAGE_SIZE);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Errore caricamento archivio";
      toast({ title: message, variant: "destructive" });
      const sorted = [...stored].sort((a, b) => b.publishedAtTs - a.publishedAtTs);
      setLocalAllArticles(sorted);
      setArticles(sorted.slice(0, PAGE_SIZE));
      setHasMore(sorted.length > PAGE_SIZE);
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadInitialArticles();
  }, [loadInitialArticles]);

  const handleLoadMore = useCallback(() => {
    if (isLoadingMore) return;
    setIsLoadingMore(true);
    const next = localAllArticles.slice(0, articles.length + PAGE_SIZE);
    setArticles(next);
    setHasMore(localAllArticles.length > next.length);
    setIsLoadingMore(false);
  }, [articles.length, isLoadingMore, localAllArticles]);

  const filteredArticles = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();
    return articles.filter((article) => {
      const text = `${article.title} ${article.subtitle} ${article.body}`.toLowerCase();
      const matchesSearch = !search || text.includes(search);
      if (!monthFilter) {
        return matchesSearch;
      }
      const date = article.publishedAtTs ? new Date(article.publishedAtTs) : new Date(article.publishedAt);
      if (Number.isNaN(date.getTime())) {
        return false;
      }
      const [year, month] = monthFilter.split("-").map((value) => parseInt(value, 10));
      const matchesMonth = date.getFullYear() === year && date.getMonth() + 1 === month;
      return matchesSearch && matchesMonth;
    });
  }, [articles, monthFilter, searchTerm]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SEO title="Archivio News" description="Archivio news" />
      <Navbar />

      <main className="max-w-screen-2xl mx-auto px-4 md:px-8 py-6">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-poster mb-2">Archivio News</h1>
            <p className="text-muted-foreground">
              {filteredArticles.length} {filteredArticles.length === 1 ? "articolo" : "articoli"} trovati
            </p>
          </div>
          <Button asChild variant="outline">
            <Link to="/news">Torna alle news</Link>
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-[2fr,1fr] mb-8">
          <Input
            placeholder="Cerca per titolo o testo"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
          <Input
            type="month"
            value={monthFilter}
            onChange={(event) => setMonthFilter(event.target.value)}
          />
        </div>

        {(searchTerm || monthFilter) && (
          <div className="mb-6">
            <Button
              variant="outline"
              onClick={() => {
                setSearchTerm("");
                setMonthFilter("");
              }}
            >
              Resetta filtri
            </Button>
          </div>
        )}

        {articles.length === 0 && !isLoading ? (
          <div className="text-muted-foreground">Nessuna news disponibile.</div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {filteredArticles.map((article) => (
                <Card key={article.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                  <div className="h-48 overflow-hidden">
                    {article.imageUrl ? (
                      <img
                        src={article.imageUrl}
                        alt={article.title}
                        className="w-full h-full object-cover transition-transform hover:scale-105"
                      />
                    ) : (
                      <div className="w-full h-full bg-secondary/40" />
                    )}
                  </div>
                  <CardContent className="p-4">
                    <h3 className="font-medium text-lg mb-2 line-clamp-2">{article.title}</h3>
                    <p className="text-muted-foreground text-sm mb-3 line-clamp-2">
                      {article.subtitle || article.body || "Nessuna descrizione disponibile."}
                    </p>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-muted-foreground">
                        {article.publishedAt
                          ? new Date(article.publishedAt).toLocaleDateString("it-IT", { day: "2-digit", month: "long", year: "numeric" })
                          : ""}
                      </span>
                      <Button asChild variant="link" className="text-accent">
                        <Link to={`/news/article?article=${encodeURIComponent(article.id)}`}>Leggi tutto</Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            {hasMore && (
              <div className="mt-8 text-center">
                <Button variant="outline" onClick={handleLoadMore} disabled={isLoadingMore}>
                  {isLoadingMore ? "Caricamento..." : "Carica altri"}
                </Button>
              </div>
            )}
          </>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default NewsArchive;
