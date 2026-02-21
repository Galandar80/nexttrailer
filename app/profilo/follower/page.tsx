import type { Metadata } from "next";
import Followers from "@/screens/Followers";

export const metadata: Metadata = {
  title: "Follower - NextTrailer",
  description: "Elenco follower.",
  robots: {
    index: false,
    follow: false
  }
};

export default function Page() {
  return <Followers />;
}
