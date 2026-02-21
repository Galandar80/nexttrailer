import type { Metadata } from "next";
import GenreBrowse from "@/screens/GenreBrowse";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://nextrailer.it";
const TMDB_BASE_URL = "https://api.themoviedb.org/3";

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
  params: { mediaType: string; genreId: string };
}): Promise<Metadata> {
  const mediaType = params.mediaType === "tv" ? "tv" : "movie";
  const genreId = params.genreId;
  const list = await fetchTmdb(`/genre/${mediaType}/list?language=it-IT`);
  const genre = list?.genres?.find((item: { id: number; name: string }) => String(item.id) === genreId);
  const name = genre?.name || "Genere";
  const title = `${name} - NextTrailer`;
  const description = `Sfoglia ${mediaType === "movie" ? "film" : "serie TV"} del genere ${name}.`;
  const pageUrl = `${SITE_URL}/${mediaType}/genre/${genreId}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: pageUrl,
      type: "website"
    },
    twitter: {
      card: "summary_large_image",
      title,
      description
    }
  };
}

export default function Page() {
  return <GenreBrowse />;
}
