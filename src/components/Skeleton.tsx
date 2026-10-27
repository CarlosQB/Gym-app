import { Spinner } from "./Spinner";

/** Bloque gris que late mientras llegan los datos. */
export function Bone({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-2xl bg-surface ${className}`} />;
}

/** Contenedor de esqueleto: avisa al lector de pantalla y muestra qué se está cargando. */
export function SkeletonScreen({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-4" role="status" aria-live="polite">
      <p className="flex items-center gap-2 text-sm text-muted">
        <Spinner className="text-accent" />
        {label}
      </p>
      {children}
    </div>
  );
}
