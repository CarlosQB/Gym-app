// Esqueleto que se muestra al instante mientras llegan los datos de la pantalla.
export default function Loading() {
  return (
    <div className="flex animate-pulse flex-col gap-4" aria-busy="true" aria-label="Cargando">
      <div className="h-10 w-2/3 rounded-xl bg-surface" />
      <div className="h-28 rounded-2xl bg-surface" />
      <div className="h-48 rounded-2xl bg-surface" />
      <div className="h-16 rounded-2xl bg-surface" />
    </div>
  );
}
