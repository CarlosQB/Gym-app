import { BottomNav } from "@/components/BottomNav";
import { OfflineSync } from "@/components/OfflineSync";
import { RemoveOldSW } from "@/components/RemoveOldSW";

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <a
        href="#contenido"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-30 focus:rounded-xl focus:bg-accent focus:px-4 focus:py-3 focus:font-semibold focus:text-bg"
      >
        Saltar al contenido
      </a>
      <main id="contenido" tabIndex={-1} className="mx-auto w-full max-w-[430px] flex-1 px-5 pb-28 pt-[calc(1.75rem+env(safe-area-inset-top))] outline-none">
        {children}
      </main>
      <BottomNav />
      <OfflineSync />
      <RemoveOldSW />
    </>
  );
}
