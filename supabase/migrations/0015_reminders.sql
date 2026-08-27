-- Relances automatiques (formule Pro) : evite de relancer plusieurs fois
-- pour la meme demande.
alter table public.projects add column if not exists quote_reminder_sent_at timestamptz;
alter table public.projects add column if not exists payment_reminder_sent_at timestamptz;
