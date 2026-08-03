import Link from "next/link";
import { Home } from "lucide-react";

import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Halaman tidak ditemukan",
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return (
    <main className="grid min-h-dvh place-items-center px-4 py-16">
      <div className="w-full max-w-md text-center">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 -z-10 mx-auto h-80 w-[36rem] max-w-full rounded-full bg-volt/15 blur-[120px]"
        />

        <p className="font-mono text-6xl font-bold text-royal sm:text-7xl">404</p>

        <h1 className="mt-4 text-2xl font-bold sm:text-3xl">
          Halaman tidak ditemukan
        </h1>
        <p className="mt-3 text-sm text-mist sm:text-base">
          Tautan yang kamu buka sudah dipindahkan atau tidak pernah ada.
        </p>

        <Button variant="gold" size="lg" asChild className="mt-8">
          <Link href="/">
            <Home aria-hidden />
            Kembali ke beranda
          </Link>
        </Button>
      </div>
    </main>
  );
}
