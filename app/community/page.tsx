import type { Metadata } from "next";
import Community from "@/screens/Community";

export const metadata: Metadata = {
  title: "Community - NextTrailer",
  description: "Condividi e scopri attività della community di NextTrailer.",
  robots: {
    index: false,
    follow: false
  }
};

export default function Page() {
  return <Community />;
}
