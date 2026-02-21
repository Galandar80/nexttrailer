import type { Metadata } from "next";
import Profile from "@/screens/Profile";

export const metadata: Metadata = {
  title: "Profilo - NextTrailer",
  description: "Profilo utente NextTrailer.",
  robots: {
    index: false,
    follow: false
  }
};

export default function Page() {
  return <Profile />;
}
