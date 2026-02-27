import type { Metadata } from "next";
import Home from "@/screens/Home";

export const metadata: Metadata = {
  title: "NextTrailer",
  description: "Scopri film e serie, organizza la visione e non perdere nessuna uscita.",
  alternates: {
    canonical: "/",
  }
};

export default function Page() {
  return <Home />;
}
