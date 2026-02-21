import type { Metadata } from "next";
import Genres from "@/screens/Genres";

export const metadata: Metadata = {
  title: "Generi - NextTrailer",
  description: "Sfoglia film e serie TV per genere."
};

export default function Page() {
  return <Genres />;
}
