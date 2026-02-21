import type { Metadata } from "next";
import "./globals.css";
import Providers from "./providers";

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
  return (
    <html lang="it">
      <body className="antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
