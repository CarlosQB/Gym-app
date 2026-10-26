"use client";

import { useState, useTransition } from "react";
import { updateExercise } from "@/app/actions";
import { MUSCLES } from "@/lib/muscles";
import type { Exercise } from "@/lib/types";

export function ExerciseRow({ exercise }: { exercise: Exercise }) {
  const [group, setGroup] = useState(exercise.muscle_group);
  const [video, setVideo] = useState(exercise.video_url ?? "");
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const dirty = group !== exercise.muscle_group || video.trim() !== (exercise.video_url ?? "");
  const options = MUSCLES.includes(group) ? MUSCLES : [group, ...MUSCLES];

  function save() {
    setMsg(null);
    start(async () => {
      const res = await updateExercise({ id: exercise.id, muscleGroup: group, videoUrl: video });
      setMsg(res.ok ? "Guardado" : (res.error ?? "Error"));
    });
  }

  return (
    <li className="flex flex-col gap-2 rounded-2xl bg-surface p-4">
      <p className="text-[16px] font-semibold">{exercise.name}</p>
      <select
        aria-label="Grupo muscular"
        value={group}
        onChange={(e) => setGroup(e.target.value)}
        className="h-11 rounded-xl bg-surface-2 px-3 text-[15px] text-text"
      >
        {options.map((m) => (
          <option key={m} value={m}>
            {m}
          </option>
        ))}
      </select>
      <input
        aria-label="Enlace del video de técnica"
        value={video}
        onChange={(e) => setVideo(e.target.value)}
        inputMode="url"
        placeholder="Video de técnica (https://…)"
        className="h-11 rounded-xl bg-surface-2 px-3 text-sm text-text outline-none"
      />
      <div className="flex items-center gap-3">
        {dirty && (
          <button
            type="button"
            disabled={pending}
            onClick={save}
            className="h-10 rounded-xl bg-accent px-4 text-sm font-semibold text-bg disabled:opacity-50"
          >
            Guardar
          </button>
        )}
        <span className="text-xs text-muted">{msg}</span>
      </div>
    </li>
  );
}
