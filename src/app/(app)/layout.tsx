import { BottomNav } from "@/components/BottomNav";
import { OfflineSync } from "@/components/OfflineSync";
import { RegisterSW } from "@/components/RegisterSW";

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <div className="mx-auto w-full max-w-[430px] flex-1 px-5 pb-28 pt-7">
        {children}
      </div>
      <BottomNav />
      <OfflineSync />
      <RegisterSW />
    </>
  );
}
