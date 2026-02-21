import type { Metadata } from "next";
import Following from "@/screens/Following";

export const metadata: Metadata = {
  title: "Seguiti - NextTrailer",
  description: "Elenco seguiti del profilo.",
  robots: {
    index: false,
    follow: false
  }
};

export default function Page() {
  return <Following />;
}
