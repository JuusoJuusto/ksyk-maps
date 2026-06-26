/**
 * KSYK Maps — Maintenance mode (minimal).
 *
 * White page. Centered narrow column. One title, one paragraph, one
 * status pill. Admins are not blocked: App.tsx bypasses this on /admin*.
 */

import { Wrench, ArrowRight } from "lucide-react";

interface Props {
  message?: string;
}

export default function MaintenanceMode({ message }: Props) {
  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-white text-gray-900 px-6">
      {/* Subtle top-edge accent */}
      <div className="absolute top-0 inset-x-0 h-px bg-gray-200" />

      <div className="flex flex-col items-center text-center max-w-md">
        {/* Tiny icon */}
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gray-100 mb-5">
          <Wrench className="h-5 w-5 text-gray-500" strokeWidth={1.8} />
        </div>

        {/* Status pill */}
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 text-[11px] font-semibold uppercase tracking-wider mb-4">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
          Maintenance
        </span>

        {/* Headline */}
        <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight mb-3">
          Be right back
        </h1>

        {/* Message */}
        <p className="text-sm sm:text-base text-gray-500 leading-relaxed">
          {message || "We're making a few quick updates. The campus map will be back shortly."}
        </p>

        {/* Admin escape hatch */}
        <a
          href="/admin"
          className="group mt-9 inline-flex items-center gap-1.5 text-xs font-semibold text-gray-700 hover:text-gray-900 transition-colors"
        >
          Admin sign-in
          <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
        </a>
      </div>

      {/* Bottom corner mark */}
      <div className="absolute bottom-5 inset-x-0 flex justify-center">
        <p className="text-[10px] font-medium tracking-[0.42em] text-gray-300 uppercase">
          KSYK · Maps
        </p>
      </div>
    </div>
  );
}
