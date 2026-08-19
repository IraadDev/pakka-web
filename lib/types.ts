/**
 * Wire types. These mirror the Go structs in pakka-api — when a handler's
 * JSON shape changes, change it here in the same commit.
 *
 * All money is integer paise. There is no float anywhere in the money path,
 * on either side of the wire.
 */

export type DealState =
  | "draft" | "invited" | "verified" | "documented" | "signed" | "funded"
  | "handed_over" | "inspecting" | "released" | "disputed" | "refunded" | "cancelled";

export type DealMode = "meet" | "ship";
export type Role = "user" | "dealer" | "admin";
export type KYCStatus = "none" | "pending" | "verified" | "failed";

export type ListingStatus =
  | "draft" | "live" | "reserved" | "sold" | "expired" | "removed";

export type Condition =
  | "new_sealed" | "like_new" | "good" | "fair" | "spares";

export const CONDITION_LABEL: Record<Condition, string> = {
  new_sealed: "New, sealed",
  like_new: "Like new",
  good: "Good",
  fair: "Fair",
  spares: "For parts",
};

export interface User {
  id: string;
  phone: string;
  name: string | null;
  email?: string | null;
  city: string | null;
  handle: string | null;
  role: Role;
  kyc_status: KYCStatus;
  kyc_name?: string | null;
  deals_done: number;
  disputes_lost: number;
  rating_avg: number | null;
  created_at: string;
}

/** The counterparty view — no phone, no email. */
export interface PublicUser {
  id: string;
  name: string | null;
  handle: string | null;
  city: string | null;
  kyc_verified: boolean;
  deals_done: number;
  disputes_lost: number;
  rating_avg: number | null;
  member_since: string;
}

export interface Category {
  id: string;
  label: string;
  colour: string;
  glyph: string;
  asset_check: string | null;
  sort_order: number;
}

export interface Photo {
  id: string;
  listing_id: string;
  url: string;
  angle: string | null;
  sort_order: number;
}

export interface ListingSeller {
  id: string;
  name: string | null;
  handle: string | null;
  city: string | null;
  kyc_verified: boolean;
  deals_done: number;
  rating_avg: number | null;
}

export interface Listing {
  id: string;
  seller_id: string;
  category_id: string;
  title: string;
  description: string | null;
  price_paise: number;
  condition: Condition;
  city: string;
  status: ListingStatus;
  published_at: string | null;
  expires_at: string | null;
  created_at: string;
  photos?: Photo[];
  seller?: ListingSeller;
}

export interface Page<T> {
  items: T[];
  total: number;
}

export interface AssetCheck {
  id: string;
  listing_id?: string | null;
  deal_id?: string | null;
  kind: "rc" | "challan" | "imei";
  subject: string;
  result: unknown;
  blocking: boolean;
  created_at: string;
}

export interface RCResult {
  plate: string;
  owner_name: string;
  make_model: string;
  registered_at: string;
  fuel_type: string;
  hypothecated: boolean;
  financier?: string;
  insurance_valid: boolean;
  insurance_upto?: string;
  puc_upto?: string;
  blacklisted: boolean;
  owner_serial: number;
}

export interface IMEIResult {
  imei: string;
  status: "clean" | "stolen" | "blocked" | "duplicate";
  brand?: string;
  model?: string;
  reported_at?: string;
}

export interface Want {
  id: string;
  buyer_id: string;
  category_id: string;
  description: string;
  budget_paise: number | null;
  city: string | null;
  status: "open" | "fulfilled" | "closed";
  created_at: string;
  buyer?: {
    id: string;
    name: string | null;
    handle: string | null;
    city: string | null;
    kyc_verified: boolean;
    deals_done: number;
  };
}

export interface Thread {
  id: string;
  listing_id: string | null;
  want_id: string | null;
  buyer_id: string;
  seller_id: string;
  created_at: string;
  listing_title?: string | null;
  other_name?: string | null;
  last_message?: string | null;
  last_at?: string | null;
  unread_count: number;
}

export interface Message {
  id: string;
  thread_id: string;
  sender_id: string;
  body: string | null;
  kind: "text" | "offer" | "system";
  offer_id?: string | null;
  created_at: string;
}

export interface Offer {
  id: string;
  thread_id: string;
  from_id: string;
  amount_paise: number;
  status: "open" | "accepted" | "declined" | "countered" | "expired";
  expires_at: string | null;
  created_at: string;
}

export interface Deal {
  id: string;
  public_token: string;
  listing_id: string | null;
  buyer_id: string;
  seller_id: string;
  created_by: string;
  category_id: string;
  title: string;
  amount_paise: number;
  fee_paise: number;
  fee_payer: "buyer" | "seller" | "split";
  mode: DealMode;
  inspection_hours: number;
  holdback_pct: number;
  state: DealState;
  expires_at: string | null;
  created_at: string;
}

export interface Terms {
  item_description: string;
  condition?: string;
  accessories?: string[];
  known_faults?: string;
  serial_or_plate?: string;
  handover_place?: string;
  handover_at?: string;
  return_window?: string;
  rc_transfer_days?: number;
  extra_clauses?: string[];
}

export interface Agreement {
  id: string;
  deal_id: string;
  terms: Terms;
  buyer_signed_at: string | null;
  seller_signed_at: string | null;
  buyer_sig_url?: string | null;
  seller_sig_url?: string | null;
  pdf_url?: string | null;
}

export interface Payment {
  id: string;
  deal_id: string;
  provider: string;
  payment_ref: string | null;
  transfer_ref: string | null;
  method: string | null;
  amount_paise: number;
  fee_paise: number;
  holdback_paise: number;
  on_hold: boolean;
  on_hold_until: string | null;
  status: "created" | "captured" | "held" | "released" | "partially_released" | "refunded" | "failed";
  funded_at: string | null;
  released_at: string | null;
}

export interface Handover {
  id: string;
  deal_id: string;
  otp_expires_at: string;
  attempts: number;
  entered_at: string | null;
  entered_by: string | null;
  serial_value?: string | null;
  photos: string[];
}

export interface Dispute {
  id: string;
  deal_id: string;
  raised_by: string;
  reason: string;
  evidence: string[];
  counter_evidence: string[];
  resolution: "release" | "refund" | "partial" | null;
  release_paise: number | null;
  decided_at: string | null;
  decision_note: string | null;
  created_at: string;
}

export interface RCTransfer {
  id: string;
  deal_id: string;
  plate: string;
  intimation_at: string | null;
  applied_at: string | null;
  confirmed_at: string | null;
  status: "pending" | "intimated" | "applied" | "confirmed" | "failed" | "expired";
}

export interface TimelineEntry {
  id: number;
  type: string;
  actor_id?: string | null;
  payload: unknown;
  created_at: string;
}

/** The full deal view returned by GET /deals/{id}. */
export interface DealDetail {
  deal: Deal;
  seller_amount: number;
  buyer_total: number;
  holdback: number;
  agreement?: Agreement;
  payment?: Payment;
  handover?: Handover;
  dispute?: Dispute;
  timeline: TimelineEntry[];
}

export interface Review {
  id: string;
  deal_id: string;
  rater_id: string;
  ratee_id: string;
  stars: number;
  body: string | null;
  created_at: string;
  rater_name?: string | null;
  rater_handle?: string | null;
  deal_title?: string | null;
}

export interface ReviewSummary {
  count: number;
  average: number | null;
  breakdown: Record<string, number>;
}

export interface Watch {
  id: string;
  user_id: string;
  listing_id: string | null;
  saved_query?: SavedQuery;
  notify: boolean;
  created_at: string;
  title?: string | null;
  price_paise?: number | null;
  status?: ListingStatus | null;
  photo_url?: string | null;
}

export interface SavedQuery {
  text?: string;
  category_id?: string;
  city?: string;
  min_paise?: number;
  max_paise?: number;
  condition?: string;
  label?: string;
}

export interface Session {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  user: User;
  is_new?: boolean;
  next?: string;
}

export interface NotificationPrefs {
  push: boolean;
  sms: boolean;
  watch: boolean;
}

export interface Upload {
  upload_url: string;
  public_url: string;
  key: string;
  headers: Record<string, string>;
  expires_at: string;
  max_bytes: number;
}

export interface Summary {
  unread_messages: number;
  pending_reviews: number;
  active_deals: number;
}

export interface Stats {
  live_listings: number;
  deals_completed: number;
  value_protected: number;
  verified_users: number;
}
