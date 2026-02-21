import type { Metadata } from "next";
import Movies from "@/screens/Movies";

export const metadata: Metadata = {
  title: "Film - NextTrailer",
  description: "Scopri i film più popolari, consigliati e in uscita."
};

export default function Page() {
  return <Movies />;
}
