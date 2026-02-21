import type { Metadata } from "next";
import NewsArticle from "@/screens/NewsArticle";

export const metadata: Metadata = {
  title: "News - NextTrailer",
  description: "News, approfondimenti e aggiornamenti su cinema e streaming."
};

export default function Page() {
  return <NewsArticle />;
}
