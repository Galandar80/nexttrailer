import type { Metadata } from "next";
import Home from "@/screens/Home";

export const metadata: Metadata = {
  title: "NextTrailer",
  description: "Il primo social network dedicato al mondo del cinema. Gestisci i tuoi film e serie tv e rimani sempre aggiornato",
  openGraph: {
    title: "NextTrailer",
    description: "Il primo social network dedicato al mondo del cinema. Gestisci i tuoi film e serie tv e rimani sempre aggiornato",
    url: "https://www.nextrailer.it",
    siteName: "NextTrailer",
    images: [
      {
        url: "/opengraph-image.jpeg",
        width: 1200,
        height: 630,
        alt: "NextTrailer",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "NextTrailer",
    description: "Il primo social network dedicato al mondo del cinema. Gestisci i tuoi film e serie tv e rimani sempre aggiornato",
    images: ["/opengraph-image.jpeg"],
  },
  other: {
    "itemprop:name": "NextTrailer",
    "itemprop:description": "Il primo social network dedicato al mondo del cinema. Gestisci i tuoi film e serie tv e rimani sempre aggiornato",
    "itemprop:image": "https://www.nextrailer.it/opengraph-image.jpeg",
  },
  alternates: {
    canonical: "/",
  }
};

export default function Page() {
  return <Home />;
}
