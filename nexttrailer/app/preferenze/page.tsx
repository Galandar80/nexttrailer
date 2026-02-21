import type { Metadata } from "next";
import Preferences from "@/screens/Preferences";

export const metadata: Metadata = {
  title: "Preferenze - NextTrailer",
  description: "Gestisci le tue preferenze personali.",
  robots: {
    index: false,
    follow: false
  }
};

export default function Page() {
  return <Preferences />;
}
