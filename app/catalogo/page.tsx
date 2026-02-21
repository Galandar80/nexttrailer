import type { Metadata } from "next";
import Catalogo from "@/screens/Catalogo";

export const metadata: Metadata = {
  title: "Catalogo - NextTrailer",
  description: "Esplora film e serie TV in tendenza e sulle principali piattaforme."
};

export default function Page() {
  return <Catalogo />;
}
