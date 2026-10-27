// Se vuelve a montar en cada cambio de pantalla, así la nueva entra con un desvanecido corto.
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="aparecer">{children}</div>;
}
