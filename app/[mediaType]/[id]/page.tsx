import type { Metadata } from "next";
import MediaDetails from "@/screens/MediaDetails";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://nextrailer.it";
const TMDB_BASE_URL = "https://api.themoviedb.org/3";
const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p";

const fetchTmdb = async (path: string) => {
  const accessToken = process.env.NEXT_PUBLIC_TMDB_ACCESS_TOKEN;
  const apiKey = process.env.NEXT_PUBLIC_TMDB_API_KEY;
  const url = apiKey ? `${TMDB_BASE_URL}${path}${path.includes("?") ? "&" : "?"}api_key=${apiKey}` : `${TMDB_BASE_URL}${path}`;
  const response = await fetch(url, {
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
    next: { revalidate: 3600 }
  });
  if (!response.ok) return null;
  return response.json();
};

import JsonLd from "@/components/JsonLd";

export async function generateMetadata({
  params
}: {
  params: { mediaType: string; id: string };
}): Promise<Metadata> {
  const mediaType = params.mediaType === "tv" ? "tv" : "movie";
  const id = params.id;
  const pageUrl = `${SITE_URL}/${mediaType}/${id}`;
  if (!id) {
    return {
      title: "NextTrailer",
      description: "Scopri film e serie TV con trailer, recensioni e watchlist personalizzata"
    };
  }

  const data = await fetchTmdb(`/${mediaType}/${id}?language=it-IT`);
  const title = mediaType === "movie" ? data?.title : data?.name;
  const description = data?.overview || "Scopri trailer, recensioni e dettagli su NextTrailer.";
  const imagePath = data?.backdrop_path || data?.poster_path;
  const image = imagePath ? `${TMDB_IMAGE_BASE}/w780${imagePath}` : undefined;

  return {
    title: title ? `${title} - NextTrailer` : "NextTrailer",
    description,
    alternates: { canonical: pageUrl },
    openGraph: {
      title: title || "NextTrailer",
      description,
      type: mediaType === "movie" ? "video.movie" : "video.tv_show",
      url: pageUrl,
      images: image ? [{ url: image }] : undefined
    },
    twitter: {
      card: "summary_large_image",
      title: title || "NextTrailer",
      description,
      images: image ? [image] : undefined
    }
  };
}

export default async function Page({ params }: { params: { mediaType: string; id: string } }) {
  const mediaType = params.mediaType === "tv" ? "tv" : "movie";
  const id = params.id;
  const data = await fetchTmdb(`/${mediaType}/${id}?language=it-IT`);
  
  const title = mediaType === "movie" ? data?.title : data?.name;
  const description = data?.overview || "Scopri trailer, recensioni e dettagli su NextTrailer.";
  const imagePath = data?.backdrop_path || data?.poster_path;
  const image = imagePath ? `${TMDB_IMAGE_BASE}/w780${imagePath}` : undefined;
  const pageUrl = `${SITE_URL}/${mediaType}/${id}`;

  const jsonLd = data ? {
    "@context": "https://schema.org",
    "@type": mediaType === "movie" ? "Movie" : "TVSeries",
    name: title,
    description: description,
    image: image,
    url: pageUrl,
    datePublished: mediaType === "movie" ? data.release_date : data.first_air_date,
    aggregateRating: data.vote_average ? {
      "@type": "AggregateRating",
      ratingValue: data.vote_average,
      bestRating: "10",
      ratingCount: data.vote_count
    } : undefined
  } : null;

  return (
    <>
      {jsonLd && <JsonLd data={jsonLd} />}
      <MediaDetails />
    </>
  );
}
