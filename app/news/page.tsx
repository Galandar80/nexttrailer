import type { Metadata } from "next";
import News from "@/screens/News";

export const metadata: Metadata = {
  title: "News - NextTrailer",
  description: "News, approfondimenti e aggiornamenti su cinema e streaming.",
  alternates: {
    canonical: "/news",
  }
};

export default function Page() {
  return <News />;
}
