import type { Metadata } from "next";
import Watchlist from "@/screens/Watchlist";

export const metadata: Metadata = {
  title: "Watchlist - NextTrailer",
  description: "La tua watchlist personale.",
  robots: {
    index: false,
    follow: false
  }
};

export default function Page() {
  return <Watchlist />;
}
