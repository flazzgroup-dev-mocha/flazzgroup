import type { Metadata } from "next";
import { Toaster } from "sonner";

export const metadata: Metadata = {
  title: "Admin — FLAZZ GROUP",
  // The panel must never be indexed.
  robots: { index: false, follow: false, nocache: true },
};

export default function AdminRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {children}
      <Toaster
        position="top-right"
        richColors
        closeButton
        toastOptions={{
          classNames: {
            toast:
              "!bg-[#0d1b3d]/95 !border !border-white/10 !text-[#eef4ff] !backdrop-blur-xl !rounded-2xl",
            description: "!text-[#9db0d0]",
          },
        }}
      />
    </>
  );
}
