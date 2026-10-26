import { cookies } from "next/headers";
import { parseUnit, type Unit } from "./units";

export async function getUnit(): Promise<Unit> {
  return parseUnit((await cookies()).get("unit")?.value);
}
