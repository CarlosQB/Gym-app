/* eslint-disable @next/next/no-img-element -- fotos externas del catálogo, sin optimizar */
"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setExerciseImage } from "@/app/actions";
import { loadCatalog, searchCatalog, techniqueImages, type CatalogItem } from "@/lib/technique";

/** Las 2 fotos de técnica: inicio y final. */
export function TechniqueImages({ imageId, name }: { imageId: string; name: string }) {
  const [start, end] = techniqueImages(imageId);
  return (
    <div className="grid grid-cols-2 gap-2">
      {[
        { src: start, step: "1. Inicio", alt: `Posición inicial de ${name}` },
        { src: end, step: "2. Final", alt: `Posición final de ${name}` },
      ].map((f) => (
        <figure key={f.src} className="overflow-hidden rounded-xl bg-white">
          <img src={f.src} alt={f.alt} loading="lazy" className="aspect-[4/3] w-full object-contain" />
          <figcaption className="bg-surface-2 py-1 text-center text-xs font-semibold text-text">{f.step}</figcaption>
        </figure>
      ))}
    </div>
  );
}

/** En la sesión: ver la técnica del ejercicio, o elegir su imagen si aún no tiene. */
export function TechniqueToggle({
  exerciseId,
  imageId,
  name,
}: {
  exerciseId: string;
  imageId: string | null | undefined;
  name: string;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<"closed" | "view" | "pick">("closed");
  return (
    <div className="mb-1">
      <div className="flex gap-4">
        {imageId ? (
          <button
            type="button"
            aria-expanded={mode === "view"}
            onClick={() => setMode((m) => (m === "view" ? "closed" : "view"))}
            className="min-h-9 text-xs font-semibold text-accent underline"
          >
            {mode === "view" ? "Ocultar técnica" : "Ver técnica"}
          </button>
        ) : (
          <button
            type="button"
            aria-expanded={mode === "pick"}
            onClick={() => setMode((m) => (m === "pick" ? "closed" : "pick"))}
            className="min-h-9 text-xs text-muted underline"
          >
            + Imagen de técnica
          </button>
        )}
        {imageId && mode === "view" && (
          <button type="button" onClick={() => setMode("pick")} className="min-h-9 text-xs text-muted underline">
            Cambiar imagen
          </button>
        )}
      </div>
      {mode === "view" && imageId && <TechniqueImages imageId={imageId} name={name} />}
      {mode === "pick" && (
        <div className="mt-1 rounded-xl bg-surface-2/50 p-2">
          <TechniquePicker
            exercise={{ id: exerciseId, name, image: imageId }}
            onDone={() => {
              setMode("closed");
              router.refresh();
            }}
          />
        </div>
      )}
    </div>
  );
}

/** En Ejercicios: buscar en el catálogo y elegir la imagen de un ejercicio. */
export function TechniquePicker({
  exercise,
  onDone,
}: {
  exercise: { id: string; name: string; image?: string | null };
  onDone: () => void;
}) {
  const [query, setQuery] = useState(exercise.name);
  const [catalog, setCatalog] = useState<CatalogItem[] | null>(null);
  const [selected, setSelected] = useState<CatalogItem | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();

  useEffect(() => {
    loadCatalog().then(setCatalog, () => setMsg("No se pudo cargar el catálogo. Revisa tu conexión."));
  }, []);

  const results = catalog ? searchCatalog(catalog, query) : [];

  function save(imageId: string | null) {
    setMsg(null);
    start(async () => {
      const res = await setExerciseImage(exercise.id, imageId);
      if (res.ok) onDone();
      else setMsg(res.error ?? "No se pudo guardar.");
    });
  }

  return (
    <div className="flex flex-col gap-2">
      {selected ? (
        <>
          <p className="text-sm font-semibold">{selected.n}</p>
          <TechniqueImages imageId={selected.id} name={selected.n} />
          <div className="flex gap-2">
            <button
              type="button"
              disabled={pending}
              onClick={() => save(selected.id)}
              className="h-11 flex-1 rounded-xl bg-accent font-semibold text-bg disabled:opacity-60"
            >
              {pending ? "Guardando…" : "Usar esta imagen"}
            </button>
            <button
              type="button"
              onClick={() => setSelected(null)}
              className="h-11 rounded-xl bg-surface-2 px-4 text-sm font-semibold text-muted"
            >
              Volver
            </button>
          </div>
        </>
      ) : (
        <>
          <label className="flex flex-col gap-1 text-sm text-muted">
            Buscar (español o inglés)
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="h-11 rounded-xl bg-surface-2 px-3 text-[15px] text-text outline-none"
            />
          </label>
          {catalog === null && !msg && <p className="text-sm text-muted">Cargando catálogo…</p>}
          {catalog && results.length === 0 && (
            <p className="text-sm text-muted">Sin resultados. Prueba con otra palabra, por ejemplo &quot;press&quot; o &quot;remo&quot;.</p>
          )}
          {results.length > 0 && (
            <ul aria-label="Resultados" className="flex max-h-80 flex-col gap-1 overflow-y-auto">
              {results.map((it) => (
                <li key={it.id}>
                  <button
                    type="button"
                    onClick={() => setSelected(it)}
                    className="flex min-h-14 w-full items-center gap-3 rounded-xl bg-surface-2 p-1.5 text-left"
                  >
                    <img
                      src={techniqueImages(it.id)[0]}
                      alt=""
                      loading="lazy"
                      className="h-11 w-14 shrink-0 rounded-lg bg-white object-contain"
                    />
                    <span className="min-w-0 text-sm">
                      {it.n}
                      <span className="block text-xs text-muted">
                        {it.m}
                        {it.e ? ` · ${it.e}` : ""}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="flex gap-2">
            {exercise.image && (
              <button
                type="button"
                disabled={pending}
                onClick={() => save(null)}
                className="h-11 rounded-xl bg-surface-2 px-4 text-sm font-semibold text-warn disabled:opacity-60"
              >
                Quitar imagen
              </button>
            )}
            <button
              type="button"
              onClick={onDone}
              className="h-11 flex-1 rounded-xl bg-surface-2 px-4 text-sm font-semibold text-muted"
            >
              Cancelar
            </button>
          </div>
        </>
      )}
      {msg && (
        <p role="alert" className="text-sm text-warn">
          {msg}
        </p>
      )}
      <p className="text-[11px] text-muted">Fotos: free-exercise-db (dominio público).</p>
    </div>
  );
}
