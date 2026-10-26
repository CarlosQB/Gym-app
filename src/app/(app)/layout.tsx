import { BottomNav } from "@/components/BottomNav";

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <div className="mx-auto w-full max-w-[430px] flex-1 px-5 pb-28 pt-7">
        {children}
      </div>
      <BottomNav />
    </>
  );
}
