import { Bone, SkeletonScreen } from "@/components/Skeleton";

export default function Loading() {
  return (
    <SkeletonScreen label="Preparando tu sesión…">
      <div className="flex items-center justify-between">
        <Bone className="size-10 rounded-full" />
        <Bone className="h-10 w-32 rounded-xl" />
        <Bone className="h-11 w-24 rounded-full" />
      </div>
      <Bone className="h-44 rounded-[20px]" />
      <Bone className="h-28 rounded-[20px]" />
      <Bone className="h-72 rounded-[20px]" />
    </SkeletonScreen>
  );
}
