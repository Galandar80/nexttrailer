import type { Metadata } from "next";
import Home from "@/screens/Home";

export const metadata: Metadata = {
  title: "NextTrailer",
  description: "Scopri film e serie, organizza la visione e non perdere nessuna uscita.",
  openGraph: {
    title: "NextTrailer",
    description: "Scopri film e serie, organizza la visione e non perdere nessuna uscita.",
    url: "https://www.nextrailer.it",
    siteName: "NextTrailer",
    images: [
      {
        url: "https://www.nextrailer.it/opengraph-image.jpeg",
        width: 1200,
        height: 630,
        alt: "NextTrailer",
        type: "image/jpeg",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "NextTrailer",
    description: "Scopri film e serie, organizza la visione e non perdere nessuna uscita.",
    images: ["https://www.nextrailer.it/opengraph-image.jpeg"],
  },
  other: {
    "itemprop:name": "NextTrailer",
    "itemprop:description": "Scopri film e serie, organizza la visione e non perdere nessuna uscita.",
    "itemprop:image": "https://www.nextrailer.it/opengraph-image.jpeg",
  },
  alternates: {
    canonical: "/",
  }
};

export default function Page() {
  return <Home />;
}
