import type { Metadata } from "next";
import NewsAdmin from "@/screens/NewsAdmin";

export const metadata: Metadata = {
  title: "Admin News - NextTrailer",
  description: "Gestione news e contenuti editoriali.",
  robots: {
    index: false,
    follow: false
  }
};

export default function Page() {
  return <NewsAdmin />;
}
