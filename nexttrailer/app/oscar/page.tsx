import type { Metadata } from "next";
import Oscar from "@/screens/Oscar";

export const metadata: Metadata = {
  title: "Oscar - NextTrailer",
  description: "Scopri gli Oscar, i vincitori e i titoli candidati."
};

export default function Page() {
  return <Oscar />;
}
