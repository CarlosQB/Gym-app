"use client";

import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export type BodyPoint = { label: string; peso: number | null; cintura: number | null };

export function BodyChart({
  data,
  unit,
  showWeight,
  showWaist,
}: {
  data: BodyPoint[];
  unit: string;
  showWeight: boolean;
  showWaist: boolean;
}) {
  return (
    <div className="h-64 w-full" role="img" aria-label="Gráfica de peso corporal y cintura">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: showWaist ? 0 : 8, bottom: 0, left: -16 }}>
          <CartesianGrid stroke="#2a2e35" vertical={false} />
          <XAxis dataKey="label" tick={{ fill: "#9ba1aa", fontSize: 11 }} tickLine={false} axisLine={false} />
          {showWeight && (
            <YAxis yAxisId="w" tick={{ fill: "#9ba1aa", fontSize: 11 }} tickLine={false} axisLine={false} domain={["dataMin - 2", "dataMax + 2"]} />
          )}
          {showWaist && (
            <YAxis yAxisId="c" orientation="right" tick={{ fill: "#9ba1aa", fontSize: 11 }} tickLine={false} axisLine={false} domain={["dataMin - 2", "dataMax + 2"]} />
          )}
          <Tooltip
            contentStyle={{ background: "#1e2126", border: "1px solid #2a2e35", borderRadius: 12, color: "#f2f3f5" }}
            labelStyle={{ color: "#9ba1aa" }}
          />
          <Legend wrapperStyle={{ fontSize: 12, color: "#9ba1aa" }} />
          {showWeight && (
            <Line yAxisId="w" type="monotone" dataKey="peso" name={`Peso (${unit})`} stroke="#cdf545" strokeWidth={2.5} dot={{ r: 3 }} connectNulls />
          )}
          {showWaist && (
            <Line yAxisId="c" type="monotone" dataKey="cintura" name="Cintura (cm)" stroke="#9ba1aa" strokeWidth={2} strokeDasharray="5 4" dot={{ r: 3 }} connectNulls />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
