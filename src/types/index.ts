export type UserRole = "admin" | "pastor" | "member";

export type ServicePlan = "rescue" | "thrive";



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
  rescue_plan_count: number;
  thrive_plan_count: number;
}

export interface ChartDataPoint {
  month: string;
  members: number;
}
