import type { Metadata } from "next";
import Search from "@/screens/Search";

export const metadata: Metadata = {
  title: "Cerca - NextTrailer",
  description: "Cerca film, serie TV, persone e titoli consigliati."
};

export default function Page() {
  return <Search />;
}
