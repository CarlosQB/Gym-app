import { Bone, SkeletonScreen } from "@/components/Skeleton";

export default function Loading() {
  return (
    <SkeletonScreen label="Cargando progreso…">
      <Bone className="h-10 w-2/3 rounded-xl" />
      <Bone className="h-64" />
      <Bone className="h-40" />
    </SkeletonScreen>
  );
}
