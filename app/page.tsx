import type { Metadata } from "next";
import Home from "@/screens/Home";

export const metadata: Metadata = {
  title: "NextTrailer",
  description: "Il primo social network dedicato al mondo del cinema. Gestisci i tuoi film e serie tv e rimani sempre aggiornato",
  alternates: {
    canonical: "/",
  }
};

export default function Page() {
  return <Home />;
}
