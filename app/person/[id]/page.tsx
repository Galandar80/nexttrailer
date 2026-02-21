import type { Metadata } from "next";
import PersonDetails from "@/screens/PersonDetails";

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

export async function generateMetadata({
  params
}: {
  params: { id: string };
}): Promise<Metadata> {
  const id = params.id;
  if (!id) {
    return {
      title: "NextTrailer",
      description: "Scopri film e serie TV con trailer, recensioni e watchlist personalizzata"
    };
  }

  const data = await fetchTmdb(`/person/${id}?language=it-IT`);
  const title = data?.name;
  const description = data?.biography || "Scopri biografie e filmografie su NextTrailer.";
  const imagePath = data?.profile_path;
  const image = imagePath ? `${TMDB_IMAGE_BASE}/w780${imagePath}` : undefined;
  const pageUrl = `${SITE_URL}/person/${id}`;

  return {
    title: title ? `${title} - NextTrailer` : "NextTrailer",
    description,
    openGraph: {
      title: title || "NextTrailer",
      description,
      type: "profile",
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

export default function Page() {
  return <PersonDetails />;
}
