/** Circulito que gira mientras algo carga. */
export function Spinner({ className = "" }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`inline-block size-[1em] shrink-0 animate-spin rounded-full border-2 border-current border-r-transparent align-[-0.125em] ${className}`}
    />
  );
}
