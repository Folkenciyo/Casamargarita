import type { Metadata } from "next";
import { HomeView } from "@/components/public/HomeView";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  description:
    "Original oil paintings: catalogue with size, medium and availability.",
  alternates: { canonical: "/en", languages: { es: "/" } },
};

export default function EnglishHomePage() {
  return <HomeView lang="en" />;
}
