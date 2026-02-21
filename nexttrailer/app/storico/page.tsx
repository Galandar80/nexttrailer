import type { Metadata } from "next";
import Library from "@/screens/Library";

export const metadata: Metadata = {
  title: "Storico - NextTrailer",
  description: "Il tuo storico di visione e contenuti salvati.",
  robots: {
    index: false,
    follow: false
  }
};

export default function Page() {
  return <Library />;
}
