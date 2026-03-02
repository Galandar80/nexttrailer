import type { Metadata } from "next";
import "./globals.css";
import Providers from "./providers";
import JsonLd from "@/components/JsonLd";

export const metadata: Metadata = {
  title: "NextTrailer",
  description: "Il primo social network dedicato al mondo del cinema. Gestisci i tuoi film e serie tv e rimani sempre aggiornato",
  metadataBase: new URL("https://www.nextrailer.it"),
  openGraph: {
    title: "NextTrailer",
    description: "Il primo social network dedicato al mondo del cinema. Gestisci i tuoi film e serie tv e rimani sempre aggiornato",
    url: "https://www.nextrailer.it",
    siteName: "NextTrailer",
    type: "website",
    images: [
      {
        url: "/opengraph-image.jpeg",
        width: 1200,
        height: 630,
        alt: "NextTrailer"
      }
    ]
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
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "NextTrailer",
    url: "https://www.nextrailer.it",
    potentialAction: {
      "@type": "SearchAction",
      target: "https://www.nextrailer.it/search?q={search_term_string}",
      "query-input": "required name=search_term_string"
    }
  };

  return (
    <html lang="it">
      <body className="antialiased">
        <JsonLd data={jsonLd} />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
