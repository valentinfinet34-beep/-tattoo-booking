alter table public.projects
  add column scheduled_start_time time,
  add column duration_hours numeric(4, 1);
