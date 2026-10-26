import { createClient } from "@/lib/supabase/server";
import { RoutineEditor } from "../RoutineEditor";
import type { Exercise } from "@/lib/types";

export default async function NuevaRutinaPage() {
  const supabase = await createClient();
  const { data } = await supabase.from("exercises").select("*").order("name");
  return <RoutineEditor catalog={(data ?? []) as Exercise[]} initial={null} />;
}
