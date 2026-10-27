-- Rendimiento: envolver auth.uid() en un select hace que Postgres lo evalúe una sola vez
-- por consulta en lugar de una vez por fila (recomendación de Supabase: auth_rls_initplan).
-- No cambia quién puede ver qué: sigue siendo "solo tus filas".
do $$
declare t text;
begin
  foreach t in array array['exercises','routines','routine_exercises','workouts','sets','body_metrics']
  loop
    execute format('drop policy if exists "own rows" on public.%I', t);
    execute format(
      'create policy "own rows" on public.%I for all to authenticated
         using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()))', t);
  end loop;
end $$;
