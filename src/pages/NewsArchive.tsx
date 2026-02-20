import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { getDb, getFirestoreModule, isFirebaseEnabled } from "@/services/firebase";
import { OptimizedImage } from "@/components/OptimizedImage";
import { useAuth } from "@/context/auth-core";

type RawRssItem = {
  title: string;
  link: string;
  publishedAt: string;
  contentHtml: string;
  contentText: string;
  imageUrl?: string;
};

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
};

const STORAGE_KEY = "news-articles";
const COMINGSOON_STORAGE_KEY = "comingsoon-articles";
const LOCAL_REFRESH_KEY = "news-last-refresh";
const DEFAULT_FEED_URL = "https://www.bestmovie.it/feed/";
const COMINGSOON_FEED_URL = "https://www.comingsoon.it/feedrss/cinema";
const MAX_ARTICLES = 3;
const MAX_COMINGSOON = 6;
const PAGE_SIZE = 18;
const MAX_ARCHIVE = 200;
const loadFirestore = async () => {
  if (!isFirebaseEnabled) return null;
  const [db, firestore] = await Promise.all([getDb(), getFirestoreModule()]);
  if (!db) return null;
  return { db, ...firestore };
};
const normalizeText = (value: unknown) => {
  if (typeof value !== "string") {
    if (value === null || value === undefined) return "";
    return String(value).replace(/\s+/g, " ").trim();
  }
  return value.replace(/\s+/g, " ").trim();
};
const extractImageUrl = (html: string) => {
  if (!html) return undefined;
  const doc = new DOMParser().parseFromString(html, "text/html");
  const img = doc.querySelector("img");
  return img?.getAttribute("src") || undefined;
};
const extractText = (html: string) => {
  if (!html) return "";
  const doc = new DOMParser().parseFromString(html, "text/html");
  return normalizeText(doc.body.textContent || "");
};
const buildFeedCandidates = (url: string) => {
  const cleanUrl = url.trim();
  const withoutProtocol = cleanUrl.replace(/^https?:\/\//, "");
  const jinaHttps = `https://r.jina.ai/http://${cleanUrl}`;
  return [
    `https://api.allorigins.win/raw?url=${encodeURIComponent(cleanUrl)}`,
    `https://corsproxy.io/?${encodeURIComponent(cleanUrl)}`,
    `https://r.jina.ai/http://${withoutProtocol}`,
    jinaHttps,
    cleanUrl
  ];
};
const fetchText = async (url: string) => {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}`.trim());
  }
  return response.text();
};
const fetchFeedViaServer = async (url: string) => {
  const response = await fetch(`/api/rss?url=${encodeURIComponent(url)}`, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}`.trim());
  }
  return response.text();
};
const fetchFeedXml = async (url: string) => {
  const candidates = buildFeedCandidates(url);
  const errors: string[] = [];
  try {
    return await fetchFeedViaServer(url);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Errore";
    errors.push(`server → ${message}`);
  }
  for (const candidate of candidates) {
    try {
      return await fetchText(candidate);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Errore";
      errors.push(`${candidate} → ${message}`);
    }
  }
  throw new Error(`Impossibile leggere il feed. ${errors.join(" | ")}`);
};
const parseRss = (xmlText: string): RawRssItem[] => {
  const xml = new DOMParser().parseFromString(xmlText, "text/xml");
  const items = Array.from(xml.getElementsByTagName("item"));
  return items.map((item) => {
    const title = item.getElementsByTagName("title")[0]?.textContent || "";
    const link = item.getElementsByTagName("link")[0]?.textContent || "";
    const pubDate = item.getElementsByTagName("pubDate")[0]?.textContent || "";
    const mediaNode = item.getElementsByTagName("media:content")[0];
    const mediaUrl = mediaNode?.getAttribute("url") || "";
    const mediaThumb = item.getElementsByTagName("media:thumbnail")[0]?.getAttribute("url") || "";
    const enclosureUrl = item.getElementsByTagName("enclosure")[0]?.getAttribute("url") || "";
    const encoded = item.getElementsByTagName("content:encoded")[0]?.textContent || "";
    const description = item.getElementsByTagName("description")[0]?.textContent || "";
    const contentHtml = encoded || description || "";
    const contentText = extractText(contentHtml);
    const imageUrl = mediaUrl || mediaThumb || enclosureUrl || extractImageUrl(contentHtml);
    return {
      title: normalizeText(title),
      link: normalizeText(link),
      publishedAt: pubDate,
      contentHtml,
      contentText,
      imageUrl
    };
  }).filter((item) => item.title && item.link);
};
const buildPrompt = (item: RawRssItem) => {
  const trimmed = item.contentText.slice(0, 6000);
  return [
    "Sei un editor di news sul cinema e streaming.",
    "Riscrivi l'articolo in italiano con parole e struttura diverse dall'originale.",
    "Non copiare frasi identiche, evita clickbait e non inventare fatti.",
    "Il titolo deve essere diverso dall'originale.",
    "Il body deve avere tra 250 e 350 parole (circa 5-8 paragrafi brevi).",
    "Restituisci solo JSON con le chiavi: title, subtitle, body, bullets.",
    "bullets deve essere un array di 3 punti chiave, frasi brevi.",
    "",
    `Titolo originale: ${item.title}`,
    `Testo articolo: ${trimmed}`
  ].join("\n");
};
const MIN_BODY_WORDS = 250;
const countWords = (text: string) => {
  if (!text) return 0;
  return text.trim().split(/\s+/).filter(Boolean).length;
};
const buildExpansionPrompt = (
  item: RawRssItem,
  title: string,
  subtitle: string,
  body: string,
  bullets: string[],
  minWords: number
) => {
  const trimmed = item.contentText.slice(0, 6000);
  return [
    "Sei un editor di news sul cinema e streaming.",
    `Espandi il testo seguente fino ad almeno ${minWords} parole, mantenendo contenuti e stile.`,
    "Non copiare frasi identiche, evita clickbait e non inventare fatti.",
    "Mantieni titolo e sottotitolo coerenti con il testo.",
    "Restituisci solo JSON con le chiavi: title, subtitle, body, bullets.",
    "bullets deve essere un array di 3 punti chiave, frasi brevi.",
    "",
    `Titolo originale: ${item.title}`,
    `Testo originale: ${trimmed}`,
    `Titolo attuale: ${title}`,
    `Sottotitolo attuale: ${subtitle}`,
    `Punti chiave attuali: ${bullets.join(" | ")}`,
    `Testo attuale: ${body}`
  ].join("\n");
};
const toDocId = (value: string) => encodeURIComponent(value);
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
    const derivedId = item.sourceUrl ? toDocId(item.sourceUrl) : "";
    const publicId = item.publicId || (item.sourceUrl ? toPublicId(item.sourceUrl) : "");
    return { ...item, id: item.id || derivedId, publicId };
  }).filter((item) => item.id);
};
const normalizeComingsoonArticles = (items: NewsArticle[]) => {
  return items.map((item) => {
    const derivedId = item.sourceUrl ? toDocId(item.sourceUrl) : "";
    const publicId = item.publicId || (item.sourceUrl ? toPublicId(item.sourceUrl) : "");
    return { ...item, id: item.id || derivedId, publicId };
  }).filter((item) => item.id);
};

const getArticleLinkId = (item: NewsArticle) => item.publicId || (item.sourceUrl ? toPublicId(item.sourceUrl) : item.id);

const isWikipediaImage = (url?: string) => {
  if (!url) return false;
  return url.includes("wikipedia.org") || url.includes("wikimedia.org");
};

const stripWikipediaImages = (items: NewsArticle[]) => {
  return items.map((item) => (isWikipediaImage(item.imageUrl) ? { ...item, imageUrl: "" } : item));
};
const extractJson = (value: string) => {
  const fenced = value.match(/```json\s*([\s\S]*?)```/i);
  if (fenced?.[1]) return fenced[1].trim();
  const first = value.indexOf("{");
  const last = value.lastIndexOf("}");
  if (first !== -1 && last !== -1 && last > first) {
    return value.slice(first, last + 1).trim();
  }
  return value.trim();
};
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const callGroq = async (prompt: string) => {
  const apiKey = import.meta.env.VITE_GROQ_API_KEY as string | undefined;
  if (!apiKey) {
    throw new Error("Manca VITE_GROQ_API_KEY");
  }
  const model = (import.meta.env.VITE_GROQ_MODEL as string | undefined) || "llama-3.1-8b-instant";
  let lastError: Error | null = null;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000);
    try {
      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: "Rispondi solo in JSON valido." },
            { role: "user", content: prompt }
          ],
          temperature: 0.6,
          response_format: { type: "json_object" }
        }),
        signal: controller.signal
      });
      if (!response.ok) {
        const errorText = await response.text();
        let message = errorText;
        try {
          const parsed = JSON.parse(errorText);
          message = parsed?.error?.message || message;
        } catch {
          message = errorText || message;
        }
        const error = new Error(`Groq ${response.status}: ${message || "Errore richiesta"}`);
        lastError = error;
        if (response.status >= 500 || response.status === 429) {
          await sleep(700 * (attempt + 1));
          continue;
        }
        throw error;
      }
      const data = await response.json();
      const text = data?.choices?.[0]?.message?.content || "";
      const jsonText = extractJson(text);
      try {
        return JSON.parse(jsonText);
      } catch {
        return { title: "", subtitle: "", body: jsonText || text, bullets: [] };
      }
    } catch (error) {
      const err = error instanceof Error ? error : new Error("Errore richiesta Groq");
      lastError = err;
      if (err.name === "AbortError") {
        lastError = new Error("Groq timeout");
      }
      if (attempt < 2) {
        await sleep(700 * (attempt + 1));
        continue;
      }
      throw lastError;
    } finally {
      clearTimeout(timeoutId);
    }
  }
  throw lastError || new Error("Errore richiesta Groq");
};
const rewriteWithMinWords = async (item: RawRssItem) => {
  let prompt = buildPrompt(item);
  const rewritten = await callGroq(prompt);
  let title = normalizeText(rewritten.title || item.title);
  let subtitle = normalizeText(rewritten.subtitle || "");
  let body = normalizeText(rewritten.body || item.contentText);
  let bullets = Array.isArray(rewritten.bullets)
    ? rewritten.bullets.map((entry: string) => normalizeText(entry)).filter(Boolean)
    : [];
  for (let attempt = 0; attempt < 2; attempt += 1) {
    if (countWords(body) >= MIN_BODY_WORDS) {
      return { title, subtitle, body, bullets };
    }
    prompt = buildExpansionPrompt(item, title, subtitle, body, bullets, MIN_BODY_WORDS);
    const expanded = await callGroq(prompt);
    title = normalizeText(expanded.title || title || item.title);
    subtitle = normalizeText(expanded.subtitle || subtitle || "");
    body = normalizeText(expanded.body || body);
    bullets = Array.isArray(expanded.bullets)
      ? expanded.bullets.map((entry: string) => normalizeText(entry)).filter(Boolean)
      : bullets;
  }
  return { title, subtitle, body, bullets };
};

const NewsArchive = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [localAllArticles, setLocalAllArticles] = useState<NewsArticle[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [monthFilter, setMonthFilter] = useState("");
  const [lastError, setLastError] = useState<string | null>(null);
  const isSuperAdmin = user?.email?.toLowerCase() === "calisma82@gmail.com";

  const feedUrl = useMemo(() => {
    return (import.meta.env.VITE_NEWS_RSS_URL as string | undefined) || DEFAULT_FEED_URL;
  }, []);

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
    const firestore = await loadFirestore();
    if (!firestore) {
      const sorted = [...stored].sort((a, b) => b.publishedAtTs - a.publishedAtTs);
      setLocalAllArticles(sorted);
      setArticles(sorted.slice(0, PAGE_SIZE));
      setHasMore(sorted.length > PAGE_SIZE);
      setIsLoading(false);
      return;
    }
    try {
      const { db, collection, getDocs, limit, orderBy, query } = firestore;
      const [newsSnapshot, comingSnapshot] = await Promise.all([
        getDocs(query(collection(db, "news_articles"), orderBy("publishedAtTs", "desc"), limit(MAX_ARCHIVE))),
        getDocs(query(collection(db, "news_comingsoon"), orderBy("publishedAtTs", "desc"), limit(MAX_ARCHIVE)))
      ]);
      const fetchedNews = stripWikipediaImages(newsSnapshot.docs.map((entry) => {
        const data = entry.data() as NewsArticle;
        return { ...data, id: data.id || entry.id, publicId: data.publicId || (data.sourceUrl ? toPublicId(data.sourceUrl) : "") };
      }));
      const fetchedComing = stripWikipediaImages(comingSnapshot.docs.map((entry) => {
        const data = entry.data() as NewsArticle;
        return { ...data, id: data.id || entry.id, publicId: data.publicId || (data.sourceUrl ? toPublicId(data.sourceUrl) : "") };
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
      setLastError(message);
      toast({ title: message, variant: "destructive" });
      const sorted = [...stored].sort((a, b) => b.publishedAtTs - a.publishedAtTs);
      setLocalAllArticles(sorted);
      setArticles(sorted.slice(0, PAGE_SIZE));
      setHasMore(sorted.length > PAGE_SIZE);
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  const refreshComingsoon = useCallback(async () => {
    const cached = normalizeComingsoonArticles(parseStoredArticles(localStorage.getItem(COMINGSOON_STORAGE_KEY)));
    const xmlText = await fetchFeedXml(COMINGSOON_FEED_URL);
    const items = parseRss(xmlText).slice(0, MAX_COMINGSOON);
    const firestore = await loadFirestore();
    const refreshed: NewsArticle[] = [];
    const refreshedIds = new Set<string>();
    for (const item of items) {
      const docId = toDocId(item.link);
      const { title, subtitle, body, bullets } = await rewriteWithMinWords(item);
      const publishedAtTs = Date.parse(item.publishedAt) || Date.now();
      const created = {
        id: docId,
        publicId: toPublicId(item.link),
        title,
        subtitle,
        body,
        bullets,
        imageUrl: item.imageUrl,
        sourceUrl: item.link,
        sourceTitle: item.title,
        publishedAt: item.publishedAt,
        publishedAtTs
      };
      refreshed.push(created);
      refreshedIds.add(docId);
      if (firestore) {
        const { db, doc, setDoc } = firestore;
        const docRef = doc(db, "news_comingsoon", docId);
        await setDoc(docRef, created, { merge: true });
      }
    }
    const merged = [
      ...refreshed,
      ...cached.filter((article) => !refreshedIds.has(article.id))
    ].sort((a, b) => b.publishedAtTs - a.publishedAtTs);
    localStorage.setItem(COMINGSOON_STORAGE_KEY, JSON.stringify(merged));
  }, []);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    setLastError(null);
    try {
      const cachedArticles = normalizeStoredArticles(parseStoredArticles(localStorage.getItem(STORAGE_KEY)));
      const xmlText = await fetchFeedXml(feedUrl);
      const items = parseRss(xmlText).slice(0, MAX_ARTICLES);
      const firestore = await loadFirestore();
      const refreshed: NewsArticle[] = [];
      const refreshedIds = new Set<string>();
      for (const item of items) {
        const docId = toDocId(item.link);
        const { title, subtitle, body, bullets } = await rewriteWithMinWords(item);
        const publishedAtTs = Date.parse(item.publishedAt) || Date.now();
        const imageUrl = item.imageUrl;
        const created = {
          id: docId,
          publicId: toPublicId(item.link),
          title,
          subtitle,
          body,
          bullets,
          imageUrl: imageUrl || item.imageUrl,
          sourceUrl: item.link,
          sourceTitle: item.title,
          publishedAt: item.publishedAt,
          publishedAtTs
        };
        refreshed.push(created);
        refreshedIds.add(docId);
        if (firestore) {
          const { db, doc, setDoc } = firestore;
          const docRef = doc(db, "news_articles", docId);
          await setDoc(docRef, created, { merge: true });
        }
      }
      const merged = [
        ...refreshed,
        ...cachedArticles.filter((article) => !refreshedIds.has(article.id))
      ];
      setLocalAllArticles(merged);
      setArticles(merged.slice(0, PAGE_SIZE));
      setHasMore(merged.length > PAGE_SIZE);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
      localStorage.setItem(LOCAL_REFRESH_KEY, String(Date.now()));
      if (firestore) {
        const { db, doc, setDoc } = firestore;
        const metaRef = doc(db, "news_meta", "global");
        await setDoc(metaRef, { lastRefreshAt: Date.now() }, { merge: true });
        await loadInitialArticles();
      }
      await refreshComingsoon();
      toast({ title: "News aggiornate" });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Errore aggiornamento news";
      setLastError(message);
      toast({ title: message, variant: "destructive" });
    } finally {
      setIsRefreshing(false);
    }
  }, [feedUrl, loadInitialArticles, refreshComingsoon, toast]);

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
      <SEO title="News" description="News su cinema e streaming" />
      <Navbar />

      <main className="max-w-screen-2xl mx-auto px-4 md:px-8 py-6">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-poster mb-2">News</h1>
            <p className="text-muted-foreground">
              {filteredArticles.length} {filteredArticles.length === 1 ? "articolo" : "articoli"} trovati
            </p>
          </div>
          {isSuperAdmin && (
            <div className="flex flex-wrap gap-3">
              <Button className="bg-accent hover:bg-accent/90" onClick={handleRefresh} disabled={isRefreshing}>
                {isRefreshing ? "Aggiornamento..." : "Aggiorna da RSS"}
              </Button>
              <Button asChild variant="outline">
                <Link to="/news/admin">Gestisci news</Link>
              </Button>
            </div>
          )}
        </div>

        {lastError && (
          <div className="text-sm text-red-500 mb-6">{lastError}</div>
        )}

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
                      <OptimizedImage
                        src={article.imageUrl}
                        alt={article.title}
                        className="w-full h-full object-cover transition-transform hover:scale-105"
                        loading="lazy"
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
                        <Link to={`/news/article?article=${encodeURIComponent(getArticleLinkId(article))}`}>Leggi tutto</Link>
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
