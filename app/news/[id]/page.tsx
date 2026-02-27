import type { Metadata } from "next";
import NewsArticle from "@/screens/NewsArticle";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://nextrailer.it";
const FIREBASE_PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const FIREBASE_API_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
const FIREBASE_BASE = FIREBASE_PROJECT_ID
  ? `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents`
  : "";

const extractString = (fields: Record<string, { stringValue?: string }> | undefined, key: string) => {
  return fields?.[key]?.stringValue || "";
};

const mapArticle = (doc: { fields?: Record<string, { stringValue?: string }> } | null) => {
  if (!doc?.fields) return null;
  return {
    title: extractString(doc.fields, "title"),
    subtitle: extractString(doc.fields, "subtitle"),
    body: extractString(doc.fields, "body"),
    imageUrl: extractString(doc.fields, "imageUrl"),
    publishedAt: extractString(doc.fields, "publishedAt")
  };
};

const fetchDocById = async (collection: string, docId: string) => {
  if (!FIREBASE_BASE || !FIREBASE_API_KEY) return null;
  const response = await fetch(`${FIREBASE_BASE}/${collection}/${docId}?key=${FIREBASE_API_KEY}`, {
    next: { revalidate: 900 }
  });
  if (!response.ok) return null;
  const data = await response.json();
  return mapArticle(data);
};

const fetchDocByPublicId = async (collection: string, publicId: string) => {
  if (!FIREBASE_BASE || !FIREBASE_API_KEY) return null;
  const response = await fetch(`${FIREBASE_BASE}:runQuery?key=${FIREBASE_API_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId: collection }],
        where: {
          fieldFilter: {
            field: { fieldPath: "publicId" },
            op: "EQUAL",
            value: { stringValue: publicId }
          }
        },
        limit: 1
      }
    }),
    next: { revalidate: 900 }
  });
  if (!response.ok) return null;
  const data = (await response.json()) as Array<{ document?: { fields?: Record<string, { stringValue?: string }> } }>;
  const doc = data?.find((entry) => entry.document)?.document || null;
  return mapArticle(doc);
};

const buildDescription = (subtitle: string, body: string) => {
  if (subtitle) return subtitle.trim();
  const cleaned = body.replace(/\s+/g, " ").trim();
  if (!cleaned) return "News, approfondimenti e aggiornamenti su cinema e streaming.";
  return cleaned.length > 160 ? `${cleaned.slice(0, 157)}...` : cleaned;
};

const normalizeImage = (imageUrl: string) => {
  if (!imageUrl) return undefined;
  return imageUrl.startsWith("http") ? imageUrl : `${SITE_URL}${imageUrl}`;
};

import JsonLd from "@/components/JsonLd";

export async function generateMetadata({
  params
}: {
  params: { id: string };
}): Promise<Metadata> {
  const id = params.id;
  const pageUrl = `${SITE_URL}/news/${id}`;
  const fallbackTitle = "News - NextTrailer";
  const fallbackDescription = "News, approfondimenti e aggiornamenti su cinema e streaming.";
  let article = await fetchDocById("news_articles", id);
  if (!article) article = await fetchDocById("news_comingsoon", id);
  if (!article) article = await fetchDocByPublicId("news_articles", id);
  if (!article) article = await fetchDocByPublicId("news_comingsoon", id);
  const title = article?.title ? `${article.title} - NextTrailer` : fallbackTitle;
  const description = buildDescription(article?.subtitle || "", article?.body || "");
  const image = normalizeImage(article?.imageUrl || "");

  return {
    title,
    description,
    alternates: { canonical: pageUrl },
    openGraph: {
      title: article?.title || fallbackTitle,
      description,
      type: "article",
      url: pageUrl,
      images: image ? [{ url: image }] : undefined
    },
    twitter: {
      card: "summary_large_image",
      title: article?.title || fallbackTitle,
      description,
      images: image ? [image] : undefined
    }
  };
}

export default async function Page({ params }: { params: { id: string } }) {
  const id = params.id;
  let article = await fetchDocById("news_articles", id);
  if (!article) article = await fetchDocById("news_comingsoon", id);
  if (!article) article = await fetchDocByPublicId("news_articles", id);
  if (!article) article = await fetchDocByPublicId("news_comingsoon", id);

  const jsonLd = article ? {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: article.title,
    image: normalizeImage(article.imageUrl || "") ? [normalizeImage(article.imageUrl || "")] : [],
    datePublished: article.publishedAt,
    dateModified: article.publishedAt,
    description: buildDescription(article.subtitle || "", article.body || ""),
    author: {
      "@type": "Person",
      name: "NextTrailer"
    }
  } : null;

  return (
    <>
      {jsonLd && <JsonLd data={jsonLd} />}
      <NewsArticle />
    </>
  );
}
