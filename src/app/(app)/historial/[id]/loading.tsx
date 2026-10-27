import { Bone, SkeletonScreen } from "@/components/Skeleton";

export default function Loading() {
  return (
    <SkeletonScreen label="Cargando resumen…">
      <Bone className="h-10 w-2/3 rounded-xl" />
      <div className="grid grid-cols-2 gap-2">
        <Bone className="h-20 rounded-xl" />
        <Bone className="h-20 rounded-xl" />
        <Bone className="h-20 rounded-xl" />
        <Bone className="h-20 rounded-xl" />
      </div>
      <Bone className="h-56" />
      <Bone className="h-56" />
    </SkeletonScreen>
  );
}
