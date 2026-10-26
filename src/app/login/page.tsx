"use client";

import { useActionState } from "react";
import { signIn } from "./actions";

export default function LoginPage() {
  const [state, action, pending] = useActionState(signIn, { error: null });

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[430px] flex-col justify-center gap-8 px-5">
      <div>
        <h1 className="font-display text-5xl font-bold leading-none">Gym</h1>
        <p className="mt-2 text-muted">Tu progreso, serie por serie.</p>
      </div>

      <form action={action} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1.5 text-sm text-muted">
          Correo
          <input
            name="email"
            type="email"
            autoComplete="email"
            required
            className="h-14 rounded-2xl bg-surface-2 px-4 text-base text-text outline-none focus:ring-2 focus:ring-accent"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm text-muted">
          Contraseña
          <input
            name="password"
            type="password"
            autoComplete="current-password"
            required
            className="h-14 rounded-2xl bg-surface-2 px-4 text-base text-text outline-none focus:ring-2 focus:ring-accent"
          />
        </label>

        {state.error && (
          <p role="alert" className="text-sm text-warn">
            {state.error}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="h-14 rounded-2xl bg-accent text-lg font-semibold text-bg disabled:opacity-60"
        >
          {pending ? "Entrando…" : "Entrar"}
        </button>
      </form>
    </main>
  );
}
