import { Suspense } from "react";

import { LoginForm } from "@/components/admin/LoginForm";
import { FlazzMark } from "@/components/common/Icons";

export default function AdminLoginPage() {
  return (
    <main className="grid min-h-dvh place-items-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-7 flex flex-col items-center text-center">
          <FlazzMark className="size-14" />
          <h1 className="mt-4 text-2xl font-bold">
            FLAZZ<span className="text-gold">GROUP</span>
          </h1>
          <p className="mt-1 font-mono text-[.6rem] tracking-[.24em] text-fog">
            ADMIN PANEL
          </p>
        </div>

        <div className="glass seam rounded-3xl p-6">
          <Suspense fallback={null}>
            <LoginForm />
          </Suspense>
        </div>

        <p className="mt-5 text-center text-xs text-fog">
          Authorised access only. Sessions expire after 8 hours.
        </p>
      </div>
    </main>
  );
}
