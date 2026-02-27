import type { Metadata } from "next";
import "./globals.css";
import Providers from "./providers";
import JsonLd from "@/components/JsonLd";

export const metadata: Metadata = {
  title: "NextTrailer",
  description: "Scopri film, serie e news con trailer e community",
  metadataBase: new URL("https://nextrailer.it"),
  openGraph: {
    title: "NextTrailer",
    description: "Scopri film, serie e news con trailer e community",
    type: "website"
  },
  twitter: {
    card: "summary_large_image",
    title: "NextTrailer",
    description: "Scopri film, serie e news con trailer e community"
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
    url: "https://nextrailer.it",
    potentialAction: {
      "@type": "SearchAction",
      target: "https://nextrailer.it/search?q={search_term_string}",
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
