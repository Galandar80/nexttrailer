import type { Metadata } from "next";
import NewsArchive from "@/screens/NewsArchive";

export const metadata: Metadata = {
  title: "Archivio News - NextTrailer",
  description: "Archivio completo delle news su cinema e streaming."
};

export default function Page() {
  return <NewsArchive />;
}
