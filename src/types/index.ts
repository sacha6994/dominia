// Matches the ssl_status enum in the database
export type SslStatus = "valid" | "expiring_soon" | "expired" | "error" | "unknown";

// Matches the domain_status enum in the database
export type DomainStatus = "active" | "expiring_soon" | "expired" | "error" | "unknown";

// Matches the alert_type enum in the database
export type AlertType = "ssl_expiry" | "domain_expiry" | "ssl_error" | "domain_error";

export interface Domain {
  id: string;
  user_id: string;
  domain_name: string;
  created_at: string;
  ssl_expiry_date: string | null;
  domain_expiry_date: string | null;
  ssl_status: SslStatus;
  domain_status: DomainStatus;
  ssl_issuer: string | null;
  domain_registrar: string | null;
  last_checked: string | null;
  public_token: string | null;
}

export interface DomainCheckHistory {
  id: string;
  domain_id: string;
  ssl_status: SslStatus;
  domain_status: DomainStatus;
  ssl_expiry_date: string | null;
  domain_expiry_date: string | null;
  checked_at: string;
}

export interface Alert {
  id: string;
  user_id: string;
  domain_id: string;
  alert_type: AlertType;
  sent_at: string;
  days_before_expiry: number;
}

// Matches the subscription_status enum in the database
export type SubscriptionStatus =
  | "active"
  | "trialing"
  | "past_due"
  | "canceled"
  | "unpaid"
  | "incomplete"
  | "incomplete_expired"
  | "paused";

export interface AlertSent {
  id: string;
  user_id: string;
  domain_id: string;
  alert_type: AlertType;
  threshold_days: number;
  sent_date: string;
  sent_at: string;
}

export interface UserSettings {
  id: string;
  user_id: string;
  webhook_url: string | null;
  webhook_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface Subscription {
  id: string;
  user_id: string;
  stripe_customer_id: string;
  stripe_subscription_id: string;
  stripe_price_id: string;
  plan_id: string;
  status: SubscriptionStatus;
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
  canceled_at: string | null;
  created_at: string;
  updated_at: string;
}
