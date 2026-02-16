import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { getDb, getFirestoreModule, isFirebaseEnabled } from "@/services/firebase";

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
const loadFirestore = async () => {
  if (!isFirebaseEnabled) return null;
  const [db, firestore] = await Promise.all([getDb(), getFirestoreModule()]);
  if (!db) return null;
  return { db, ...firestore };
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
const isProbablyUrl = (value: string) => value.startsWith("http://") || value.startsWith("https://");
const isSourceLike = (value: string) => value.includes("http://") || value.includes("https://") || value.includes("%2F") || value.includes("%3A");

const NewsArticlePage = () => {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const [article, setArticle] = useState<NewsArticle | null>(null);
  const [isMissing, setIsMissing] = useState(false);

  const { candidateDocIds, candidatePublicIds } = useMemo(() => {
    const paramId = searchParams.get("article") || "";
    const raw = paramId || id || "";
    if (!raw) {
      return { candidateDocIds: [] as string[], candidatePublicIds: [] as string[] };
    }
    const decoded = (() => {
      try {
        return decodeURIComponent(raw);
      } catch {
        return raw;
      }
    })();
    const candidates = [raw, decoded].filter(Boolean);
    const docIds = new Set<string>();
    const publicIds = new Set<string>();
    for (const candidate of candidates) {
      docIds.add(candidate);
      if (isProbablyUrl(candidate)) {
        docIds.add(toDocId(candidate));
      }
      if (!isSourceLike(candidate)) {
        publicIds.add(candidate);
      }
    }
    return { candidateDocIds: Array.from(docIds), candidatePublicIds: Array.from(publicIds) };
  }, [id, searchParams]);

  const shareUrl = useMemo(() => {
    if (typeof window === "undefined") return "";
    return window.location.href;
  }, []);

  const shareTitle = article?.title || "News";
  const canNativeShare = typeof navigator !== "undefined" && !!navigator.share;
  const seoImage = article?.imageUrl || "/og-image.png";

  const seoDescription = useMemo(() => {
    if (article?.subtitle) return article.subtitle.trim();
    if (!article?.body) return "News";
    const cleaned = article.body.replace(/\s+/g, " ").trim();
    return cleaned.length > 160 ? `${cleaned.slice(0, 157)}...` : cleaned;
  }, [article]);

  const shareImage = useMemo(() => {
    if (typeof window === "undefined") return seoImage;
    const origin = window.location.origin;
    return seoImage.startsWith("http") ? seoImage : `${origin}${seoImage}`;
  }, [seoImage]);

  const shareMetaUrl = useMemo(() => {
    if (typeof window === "undefined") return "";
    const origin = window.location.origin;
    const params = new URLSearchParams();
    params.set("title", shareTitle);
    params.set("description", seoDescription);
    params.set("image", shareImage);
    params.set("url", shareUrl);
    return `${origin}/api/share/news?${params.toString()}`;
  }, [seoDescription, shareImage, shareTitle, shareUrl]);

  const shareTargetUrl = shareMetaUrl || shareUrl;
  const shareText = `${shareTitle}${shareTargetUrl ? ` - ${shareTargetUrl}` : ""}`;
  const encodedUrl = encodeURIComponent(shareTargetUrl);
  const encodedTitle = encodeURIComponent(shareTitle);
  const encodedText = encodeURIComponent(shareText);

  const publishedIso = useMemo(() => {
    if (!article?.publishedAt) return "";
    const parsed = new Date(article.publishedAt);
    if (Number.isNaN(parsed.getTime())) return "";
    return parsed.toISOString();
  }, [article?.publishedAt]);

  const seoJsonLd = useMemo(() => {
    if (!article) return null;
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const logoUrl = origin ? `${origin}/icon-512.png` : "/icon-512.png";
    return {
      "@context": "https://schema.org",
      "@type": "NewsArticle",
      headline: article.title,
      description: seoDescription,
      image: seoImage.startsWith("http") ? seoImage : origin ? `${origin}${seoImage}` : seoImage,
      datePublished: publishedIso || undefined,
      dateModified: publishedIso || undefined,
      author: {
        "@type": "Organization",
        name: "NextTrailer"
      },
      publisher: {
        "@type": "Organization",
        name: "NextTrailer",
        logo: {
          "@type": "ImageObject",
          url: logoUrl
        }
      },
      mainEntityOfPage: shareUrl || undefined
    };
  }, [article, publishedIso, seoDescription, seoImage, shareUrl]);

  const seoType = article ? "article" : "website";

  const handleNativeShare = async () => {
    if (!shareUrl || !canNativeShare) return;
    try {
      await navigator.share({ title: shareTitle, text: shareTitle, url: shareTargetUrl });
    } catch {
      return;
    }
  };

  useEffect(() => {
    const loadArticle = async () => {
      const stored = localStorage.getItem(STORAGE_KEY);
      const comingsoonStored = localStorage.getItem(COMINGSOON_STORAGE_KEY);
      const localArticles = stored ? (JSON.parse(stored) as NewsArticle[]) : [];
      const comingsoonArticles = comingsoonStored ? (JSON.parse(comingsoonStored) as NewsArticle[]) : [];
      const normalizedLocal = [...localArticles, ...comingsoonArticles].map((item) => {
        const derivedId = item.sourceUrl ? toDocId(item.sourceUrl) : "";
        const publicId = item.publicId || (item.sourceUrl ? toPublicId(item.sourceUrl) : "");
        return { ...item, id: item.id || derivedId, publicId };
      }).filter((item) => item.id);
      const localMatch = normalizedLocal.find((item) => candidateDocIds.includes(item.id) || (!!item.publicId && candidatePublicIds.includes(item.publicId)));
      const firestore = await loadFirestore();
      if (!firestore) {
        if (localMatch) {
          setArticle(localMatch);
          setIsMissing(false);
        } else {
          setIsMissing(true);
        }
        return;
      }
      try {
        const { db, collection, doc, getDoc, getDocs, limit, query, where } = firestore;
        for (const candidateId of candidateDocIds) {
          const docRef = doc(db, "news_articles", candidateId);
          const snapshot = await getDoc(docRef);
          if (snapshot.exists()) {
            const data = snapshot.data() as NewsArticle;
            const publicId = data.publicId || (data.sourceUrl ? toPublicId(data.sourceUrl) : "");
            setArticle({ ...data, id: data.id || candidateId, publicId });
            setIsMissing(false);
            return;
          }
        }
        if (candidatePublicIds.length > 0) {
          for (const candidatePublicId of candidatePublicIds) {
            const newsQuery = query(
              collection(db, "news_articles"),
              where("publicId", "==", candidatePublicId),
              limit(1)
            );
            const snapshot = await getDocs(newsQuery);
            if (!snapshot.empty) {
              const docSnap = snapshot.docs[0];
              const data = docSnap.data() as NewsArticle;
              setArticle({ ...data, id: data.id || docSnap.id, publicId: data.publicId || candidatePublicId });
              setIsMissing(false);
              return;
            }
          }
        }
        for (const candidateId of candidateDocIds) {
          const docRef = doc(db, "news_comingsoon", candidateId);
          const snapshot = await getDoc(docRef);
          if (snapshot.exists()) {
            const data = snapshot.data() as NewsArticle;
            const publicId = data.publicId || (data.sourceUrl ? toPublicId(data.sourceUrl) : "");
            setArticle({ ...data, id: data.id || candidateId, publicId });
            setIsMissing(false);
            return;
          }
        }
        if (candidatePublicIds.length > 0) {
          for (const candidatePublicId of candidatePublicIds) {
            const comingQuery = query(
              collection(db, "news_comingsoon"),
              where("publicId", "==", candidatePublicId),
              limit(1)
            );
            const snapshot = await getDocs(comingQuery);
            if (!snapshot.empty) {
              const docSnap = snapshot.docs[0];
              const data = docSnap.data() as NewsArticle;
              setArticle({ ...data, id: data.id || docSnap.id, publicId: data.publicId || candidatePublicId });
              setIsMissing(false);
              return;
            }
          }
        }
        if (localMatch) {
          setArticle(localMatch);
          setIsMissing(false);
        } else {
          setIsMissing(true);
        }
      } catch {
        if (localMatch) {
          setArticle(localMatch);
          setIsMissing(false);
        } else {
          setIsMissing(true);
        }
      }
    };
    loadArticle();
  }, [candidateDocIds, candidatePublicIds]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SEO
        title={article?.title || "News"}
        description={seoDescription}
        image={seoImage}
        type={seoType}
        url={shareUrl}
        publishedTime={article ? publishedIso || undefined : undefined}
        modifiedTime={article ? publishedIso || undefined : undefined}
        author={article ? "NextTrailer" : undefined}
        section={article ? "News" : undefined}
        jsonLd={seoJsonLd || undefined}
      />
      <Navbar />

      <main className="max-w-screen-lg mx-auto px-4 md:px-8 py-8 space-y-6">
        <Button asChild variant="outline" className="w-fit">
          <Link to="/news">Torna alle news</Link>
        </Button>

        {isMissing && (
          <div className="text-muted-foreground">Articolo non disponibile.</div>
        )}

        {article && (
          <article className="space-y-5">
            <div className="space-y-2">
              <h1 className="text-3xl md:text-4xl font-bold">{article.title}</h1>
              {article.subtitle && (
                <p className="text-muted-foreground">{article.subtitle}</p>
              )}
              {article.publishedAt && (
                <p className="text-xs text-muted-foreground">
                  {new Date(article.publishedAt).toLocaleDateString("it-IT", { day: "2-digit", month: "long", year: "numeric" })}
                </p>
              )}
            </div>

            {article.imageUrl ? (
              <img
                src={article.imageUrl}
                alt={article.title}
                className="w-full max-h-[420px] object-cover rounded-2xl"
              />
            ) : (
              <div className="w-full h-[260px] rounded-2xl bg-secondary/40" />
            )}

            {article.bullets.length > 0 && (
              <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                {article.bullets.map((bullet, index) => (
                  <li key={`${article.id}-bullet-${index}`}>{bullet}</li>
                ))}
              </ul>
            )}

            <p className="text-base leading-relaxed text-foreground/90">{article.body}</p>

            <div className="pt-4 border-t border-muted/30 flex flex-wrap gap-3 items-center">
              <span className="text-sm text-muted-foreground">Condividi:</span>
              <Button variant="outline" onClick={handleNativeShare} disabled={!shareUrl || !canNativeShare}>
                Condividi
              </Button>
              <Button asChild variant="outline">
                <a
                  href={`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Facebook
                </a>
              </Button>
              <Button asChild variant="outline">
                <a
                  href={`https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  X
                </a>
              </Button>
              <Button asChild variant="outline">
                <a
                  href={`https://wa.me/?text=${encodedText}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  WhatsApp
                </a>
              </Button>
              <Button asChild variant="outline">
                <a
                  href={`https://t.me/share/url?url=${encodedUrl}&text=${encodedTitle}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Telegram
                </a>
              </Button>
              <Button asChild variant="outline">
                <a
                  href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  LinkedIn
                </a>
              </Button>
            </div>
          </article>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default NewsArticlePage;
