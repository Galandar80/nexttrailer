import type { Metadata } from "next";
import Notifications from "@/screens/Notifications";

export const metadata: Metadata = {
  title: "Notifiche - NextTrailer",
  description: "Le tue notifiche personali.",
  robots: {
    index: false,
    follow: false
  }
};

export default function Page() {
  return <Notifications />;
}
