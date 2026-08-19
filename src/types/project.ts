export type ProjectStatus = "pending" | "accepted" | "deposit_paid" | "declined";

export interface Project {
  id: string;
  artist_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  description: string;
  body_location: string;
  size_cm: number | null;
  size_category: string | null;
  style: string | null;
  color_mode: string | null;
  preferred_date: string;
  time_slot: string;
  image_urls: string[];
  status: ProjectStatus;
  deposit_amount_cents: number | null;
  scheduled_start_time: string | null;
  duration_hours: number | null;
  stripe_checkout_url: string | null;
  stripe_session_id: string | null;
  deposit_terms_accepted_at: string | null;
  created_at: string;
  updated_at: string;
}
