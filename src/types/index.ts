export type UserRole = "admin" | "pastor" | "member" | "donor";

export type ServicePlan = "donation" | "rescue" | "thrive";

export type DonationStatus = "completed" | "pending" | "failed" | "refunded";

export type PrayerRequestStatus = "open" | "answered" | "closed";

export type EventStatus = "upcoming" | "ongoing" | "completed" | "cancelled";

export type MessageStatus = "sent" | "read" | "archived";

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  phone?: string;
  church_name?: string;
  church_size?: string;
  city?: string;
  state?: string;
  role: UserRole;
  service_plan?: ServicePlan;
  avatar_url?: string;
  bio?: string;
  website?: string;
  years_in_ministry?: number;
  created_at: string;
  updated_at: string;
  is_active: boolean;
  notes?: string;
}

export interface Donation {
  id: string;
  user_id: string;
  amount: number;
  currency: string;
  status: DonationStatus;
  payment_method?: string;
  transaction_id?: string;
  notes?: string;
  created_at: string;
  profile?: Profile;
}

export interface ServiceSubscription {
  id: string;
  user_id: string;
  plan: ServicePlan;
  status: "active" | "cancelled" | "paused" | "trial";
  start_date: string;
  end_date?: string;
  amount: number;
  billing_cycle: "monthly" | "annual";
  created_at: string;
  profile?: Profile;
}

export interface PrayerRequest {
  id: string;
  user_id: string;
  title: string;
  description: string;
  status: PrayerRequestStatus;
  is_anonymous: boolean;
  created_at: string;
  updated_at: string;
  profile?: Profile;
}

export interface Event {
  id: string;
  title: string;
  description: string;
  event_date: string;
  event_time?: string;
  location?: string;
  is_virtual: boolean;
  meeting_link?: string;
  max_attendees?: number;
  status: EventStatus;
  created_by: string;
  created_at: string;
  attendees?: EventAttendee[];
}

export interface EventAttendee {
  id: string;
  event_id: string;
  user_id: string;
  registered_at: string;
  profile?: Profile;
}

export interface Message {
  id: string;
  sender_id: string;
  recipient_id?: string;
  subject: string;
  body: string;
  status: MessageStatus;
  is_broadcast: boolean;
  created_at: string;
  sender?: Profile;
  recipient?: Profile;
}

export interface DashboardStats {
  total_members: number;
  active_subscriptions: number;
  total_donations_month: number;
  total_donations_all: number;
  open_prayer_requests: number;
  upcoming_events: number;
  rescue_plan_count: number;
  thrive_plan_count: number;
}

export interface ChartDataPoint {
  month: string;
  donations: number;
  members: number;
}
