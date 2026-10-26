"use client";

import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export type Point = { label: string; peso: number; rm: number };

export function ExerciseChart({ data }: { data: Point[] }) {
  return (
    <div className="h-64 w-full" role="img" aria-label="Gráfica de peso y 1RM estimado por sesión">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
          <CartesianGrid stroke="#2a2e35" vertical={false} />
          <XAxis dataKey="label" tick={{ fill: "#9ba1aa", fontSize: 11 }} tickLine={false} axisLine={false} />
          <YAxis
            tick={{ fill: "#9ba1aa", fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            domain={["dataMin - 5", "dataMax + 5"]}
          />
          <Tooltip
            contentStyle={{ background: "#1e2126", border: "1px solid #2a2e35", borderRadius: 12, color: "#f2f3f5" }}
            labelStyle={{ color: "#9ba1aa" }}
          />
          <Legend wrapperStyle={{ fontSize: 12, color: "#9ba1aa" }} />
          <Line type="monotone" dataKey="peso" name="Peso (lb)" stroke="#cdf545" strokeWidth={2.5} dot={{ r: 3 }} />
          <Line
            type="monotone"
            dataKey="rm"
            name="1RM estimado"
            stroke="#9ba1aa"
            strokeWidth={2}
            strokeDasharray="5 4"
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
