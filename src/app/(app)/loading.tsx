import { Bone, SkeletonScreen } from "@/components/Skeleton";

// Esqueleto que se muestra al instante mientras llegan los datos de la pantalla.
export default function Loading() {
  return (
    <SkeletonScreen label="Cargando…">
      <Bone className="h-10 w-2/3 rounded-xl" />
      <Bone className="h-28" />
      <Bone className="h-48" />
      <Bone className="h-16" />
    </SkeletonScreen>
  );
}
