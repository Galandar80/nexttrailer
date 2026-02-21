import type { Metadata } from "next";
import TvSeries from "@/screens/TvSeries";

export const metadata: Metadata = {
  title: "Serie TV - NextTrailer",
  description: "Esplora serie TV popolari, nuove uscite e consigliate."
};

export default function Page() {
  return <TvSeries />;
}
