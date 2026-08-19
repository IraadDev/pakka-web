/**
 * Typed client for pakka-api. Error codes mirror internal/httpx/respond.go —
 * keep the two in sync.
 *
 * Token handling lives here rather than in components: a 401 triggers one
 * refresh attempt and a retry, so a screen never has to think about expiry.
 */
import type {
  Agreement, AssetCheck, Category, Deal, DealDetail, DealState, Dispute, Listing, ListingStatus,
  Message, NotificationPrefs, Offer, Page, Payment, Photo, PublicUser, Review, ReviewSummary,
  SavedQuery, Session, Stats, Summary, Terms, Thread, Upload, User, Want, Watch, RCTransfer,
} from "./types";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

export type ErrorCode =
  | "unauthorized" | "forbidden" | "not_found" | "validation_failed"
  | "kyc_required" | "payout_name_mismatch" | "illegal_state_transition"
  | "rate_limited" | "asset_check_blocking" | "internal_error";

export class ApiError extends Error {
  constructor(
    public code: ErrorCode,
    message: string,
    public status: number,
    public field?: string,
    /** Present on 422 — one entry per bad field, so a form can mark them all. */
    public errors?: { code: string; message: string; field?: string }[],
  ) {
    super(message);
    this.name = "ApiError";
  }
}

// ── token storage ────────────────────────────────────────────────────────────
// localStorage rather than a cookie: the API is a separate origin and takes a
// bearer token, so there is no cookie to send. XSS would expose either.

const ACCESS = "pakka.access";
const REFRESH = "pakka.refresh";

export const tokens = {
  access: () => (typeof window === "undefined" ? null : localStorage.getItem(ACCESS)),
  refresh: () => (typeof window === "undefined" ? null : localStorage.getItem(REFRESH)),
  set(s: Pick<Session, "access_token" | "refresh_token">) {
    localStorage.setItem(ACCESS, s.access_token);
    localStorage.setItem(REFRESH, s.refresh_token);
  },
  clear() {
    localStorage.removeItem(ACCESS);
    localStorage.removeItem(REFRESH);
  },
};

/** Fired when refresh fails, so the app can send the user to /login once. */
const AUTH_LOST = "pakka:auth-lost";
export function onAuthLost(fn: () => void) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(AUTH_LOST, fn);
  return () => window.removeEventListener(AUTH_LOST, fn);
}

let refreshing: Promise<boolean> | null = null;

/** Exchanges the refresh token. Concurrent callers share one in-flight attempt. */
async function tryRefresh(): Promise<boolean> {
  if (refreshing) return refreshing;

  const rt = tokens.refresh();
  if (!rt) return false;

  refreshing = (async () => {
    try {
      const res = await fetch(`${BASE}/v1/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: rt }),
      });
      if (!res.ok) throw new Error("refresh failed");
      tokens.set(await res.json());
      return true;
    } catch {
      tokens.clear();
      if (typeof window !== "undefined") window.dispatchEvent(new Event(AUTH_LOST));
      return false;
    } finally {
      refreshing = null;
    }
  })();

  return refreshing;
}

type Init = Omit<RequestInit, "body"> & { body?: unknown; auth?: boolean; retry?: boolean };

async function request<T>(path: string, init: Init = {}): Promise<T> {
  const { body, auth = true, retry = true, ...rest } = init;
  const token = auth ? tokens.access() : null;

  const res = await fetch(`${BASE}${path}`, {
    ...rest,
    headers: {
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...rest.headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (res.status === 401 && auth && retry && tokens.refresh()) {
    if (await tryRefresh()) return request<T>(path, { ...init, retry: false });
  }

  if (!res.ok) {
    let code: ErrorCode = "internal_error";
    let message = res.statusText;
    let field: string | undefined;
    let errors: ApiError["errors"];
    try {
      const b = await res.json();
      code = b?.error?.code ?? code;
      message = b?.error?.message ?? message;
      field = b?.error?.field;
      errors = b?.errors;
    } catch {
      /* non-JSON error body — keep the status text */
    }
    throw new ApiError(code, message, res.status, field, errors);
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

const qs = (o: Record<string, string | number | boolean | undefined>) => {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(o)) {
    if (v !== undefined && v !== "" && v !== false) p.set(k, String(v));
  }
  const s = p.toString();
  return s ? `?${s}` : "";
};

// ── the surface ──────────────────────────────────────────────────────────────

export const api = {
  // health & reference
  health: () => request<{ status: string; env: string; provider: string }>("/healthz", { auth: false }),
  categories: () => request<{ categories: Category[] }>("/v1/categories", { auth: false }),
  stats: () => request<Stats>("/v1/stats", { auth: false }),
  fees: (amountPaise?: number) =>
    request<{ tiers?: { upto: number; fee: number }[]; fee_paise?: number }>(
      `/v1/fees${amountPaise ? qs({ amount_paise: amountPaise }) : ""}`, { auth: false }),

  // auth
  sendOTP: (phone: string) =>
    request<{ sent: boolean; expires_in: number; debug_code?: string }>(
      "/v1/auth/otp/send", { method: "POST", body: { phone }, auth: false }),
  verifyOTP: (phone: string, code: string) =>
    request<Session>("/v1/auth/otp/verify", { method: "POST", body: { phone, code }, auth: false }),

  // me
  me: () => request<{ user: User; next?: string }>("/v1/me"),
  updateMe: (patch: Partial<Pick<User, "name" | "email" | "city" | "handle">>) =>
    request<{ user: User }>("/v1/me", { method: "PATCH", body: patch }),

  // kyc
  startKYC: (redirectURL: string) =>
    request<{ auth_url: string; ref: string }>("/v1/kyc/start", { method: "POST", body: { redirect_url: redirectURL } }),
  completeKYC: (code: string, ref: string) =>
    request<Session>("/v1/kyc/complete", { method: "POST", body: { code, ref } }),

  // payout
  payoutAccounts: () => request<{ accounts: PayoutAccount[] }>("/v1/payout-accounts"),
  addPayoutAccount: (b: { kind: "bank" | "vpa"; value: string; ifsc?: string }) =>
    request<{ account: PayoutAccount }>("/v1/payout-accounts", { method: "POST", body: b }),
  setDefaultPayout: (id: string) => request<void>(`/v1/payout-accounts/${id}/default`, { method: "PUT" }),
  removePayout: (id: string) => request<void>(`/v1/payout-accounts/${id}`, { method: "DELETE" }),

  // listings
  listings: (f: ListingFilter = {}) =>
    request<Page<Listing>>(`/v1/listings${qs(f as Record<string, string | number | boolean | undefined>)}`, { auth: false }),
  listing: (id: string) =>
    request<{ listing: Listing; checks: AssetCheck[]; similar: Listing[] }>(`/v1/listings/${id}`),
  myListings: (status?: string) => request<Page<Listing>>(`/v1/my/listings${qs({ status })}`),
  createListing: (b: NewListing) => request<{ listing: Listing }>("/v1/listings", { method: "POST", body: b }),
  updateListing: (id: string, b: Partial<NewListing>) =>
    request<{ listing: Listing }>(`/v1/listings/${id}`, { method: "PATCH", body: b }),
  deleteListing: (id: string) => request<void>(`/v1/listings/${id}`, { method: "DELETE" }),
  publishListing: (id: string) => request<{ listing: Listing }>(`/v1/listings/${id}/publish`, { method: "POST" }),
  addPhoto: (id: string, b: { url: string; angle?: string; sort_order?: number }) =>
    request<{ photo: Photo; duplicate_of: string[] }>(`/v1/listings/${id}/photos`, { method: "POST", body: b }),
  removePhoto: (listingID: string, photoID: string) =>
    request<void>(`/v1/listings/${listingID}/photos/${photoID}`, { method: "DELETE" }),
  runCheck: (id: string, b: { kind: "rc" | "challan" | "imei"; subject: string }) =>
    request<{ check: AssetCheck; blocking: boolean; cached?: boolean }>(`/v1/listings/${id}/checks`, { method: "POST", body: b }),
  listingChecks: (id: string) => request<{ checks: AssetCheck[] }>(`/v1/listings/${id}/checks`, { auth: false }),

  // uploads
  presign: (kind: string, contentType: string) =>
    request<{ upload: Upload }>("/v1/uploads/presign", { method: "POST", body: { kind, content_type: contentType } }),

  // saved
  saved: () => request<{ saved: Watch[] }>("/v1/saved"),
  save: (listingID: string) => request<{ watch: Watch }>(`/v1/listings/${listingID}/save`, { method: "POST" }),
  unsave: (listingID: string) => request<void>(`/v1/listings/${listingID}/save`, { method: "DELETE" }),
  searches: () => request<{ searches: Watch[] }>("/v1/searches"),
  saveSearch: (q: SavedQuery & { notify: boolean }) =>
    request<{ watch: Watch }>("/v1/searches", { method: "POST", body: q }),
  deleteWatch: (id: string) => request<void>(`/v1/watches/${id}`, { method: "DELETE" }),

  // wants
  wants: (f: { category?: string; city?: string } = {}) =>
    request<{ wants: Want[] }>(`/v1/wants${qs(f)}`, { auth: false }),
  want: (id: string) =>
    request<{ want: Want; matching_listing_ids: string[] }>(`/v1/wants/${id}`, { auth: false }),
  myWants: () => request<{ wants: Want[] }>("/v1/my/wants"),
  createWant: (b: { category_id: string; description: string; budget_paise?: number; city?: string }) =>
    request<{ want: Want }>("/v1/wants", { method: "POST", body: b }),
  updateWant: (id: string, status: "open" | "fulfilled" | "closed") =>
    request<{ ok: boolean }>(`/v1/wants/${id}`, { method: "PATCH", body: { status } }),

  // threads
  threads: () => request<{ threads: Thread[] }>("/v1/threads"),
  thread: (id: string) =>
    request<{ thread: Thread; messages: Message[]; offers: Offer[] }>(`/v1/threads/${id}`),
  openThread: (listingID: string, message?: string) =>
    request<{ thread: Thread; message: Message | null }>("/v1/threads", {
      method: "POST", body: { listing_id: listingID, message },
    }),
  postMessage: (threadID: string, body: string) =>
    request<{ message: Message }>(`/v1/threads/${threadID}/messages`, { method: "POST", body: { body } }),
  markRead: (threadID: string) =>
    request<{ unread_total: number }>(`/v1/threads/${threadID}/read`, { method: "POST" }),
  makeOffer: (threadID: string, amountPaise: number) =>
    request<{ offer: Offer }>(`/v1/threads/${threadID}/offers`, { method: "POST", body: { amount_paise: amountPaise } }),
  acceptOffer: (offerID: string) => request<{ offer: Offer }>(`/v1/offers/${offerID}/accept`, { method: "POST" }),
  declineOffer: (offerID: string) => request<{ ok: boolean }>(`/v1/offers/${offerID}/decline`, { method: "POST" }),

  // deals
  deals: (state?: string) => request<{ deals: Deal[] }>(`/v1/deals${qs({ state })}`),
  deal: (id: string) => request<DealDetail>(`/v1/deals/${id}`),
  createDeal: (b: NewDeal) => request<{ deal: Deal }>("/v1/deals", { method: "POST", body: b }),
  invite: (id: string) => request<{ deal: Deal }>(`/v1/deals/${id}/invite`, { method: "POST" }),
  putTerms: (id: string, terms: Terms) =>
    request<{ deal: Deal; agreement: Agreement }>(`/v1/deals/${id}/terms`, { method: "PUT", body: terms }),
  sign: (id: string, signatureURL?: string) =>
    request<{ deal: Deal; agreement: Agreement }>(`/v1/deals/${id}/sign`, {
      method: "POST", body: { signature_url: signatureURL ?? "" },
    }),
  cancelDeal: (id: string) => request<{ deal: Deal }>(`/v1/deals/${id}/cancel`, { method: "POST" }),
  fund: (id: string, callbackURL: string) =>
    request<{ payment: Payment; checkout_url: string; upi_only: boolean }>(`/v1/deals/${id}/fund`, {
      method: "POST", body: { callback_url: callbackURL },
    }),
  startHandover: (id: string) =>
    request<{ sent_to_buyer: boolean; expires_at: string }>(`/v1/deals/${id}/handover/start`, { method: "POST" }),
  completeHandover: (id: string, b: { code: string; serial?: string; photos?: string[] }) =>
    request<{ deal: Deal; released: boolean }>(`/v1/deals/${id}/handover/complete`, { method: "POST", body: b }),
  ship: (id: string, b: { courier: string; tracking: string }) =>
    request<{ deal: Deal }>(`/v1/deals/${id}/ship`, { method: "POST", body: b }),
  confirmReceipt: (id: string) =>
    request<{ deal: Deal; released: boolean }>(`/v1/deals/${id}/confirm`, { method: "POST" }),
  raiseDispute: (id: string, b: { reason: string; evidence?: string[] }) =>
    request<{ deal: Deal; dispute: Dispute; decision_by: string }>(`/v1/deals/${id}/dispute`, { method: "POST", body: b }),
  addEvidence: (id: string, evidence: string[]) =>
    request<{ ok: boolean }>(`/v1/deals/${id}/dispute/evidence`, { method: "POST", body: { evidence } }),

  // rc transfer
  startRC: (id: string, plate: string) =>
    request<{ transfer: RCTransfer; holdback_paise: number }>(`/v1/deals/${id}/rc`, { method: "POST", body: { plate } }),
  rc: (id: string) => request<{ transfer: RCTransfer; holdback_paise: number }>(`/v1/deals/${id}/rc`),
  advanceRC: (id: string, stage: "intimated" | "applied") =>
    request<{ transfer: RCTransfer }>(`/v1/deals/${id}/rc`, { method: "PATCH", body: { stage } }),
  confirmRC: (id: string) =>
    request<{ transfer: RCTransfer; confirmed: boolean; message?: string }>(`/v1/deals/${id}/rc/confirm`, { method: "POST" }),

  // reviews
  review: (dealID: string, b: { stars: number; body?: string }) =>
    request<{ review: Review }>(`/v1/deals/${dealID}/review`, { method: "POST", body: b }),
  dealReviews: (dealID: string) => request<{ reviews: Review[] }>(`/v1/deals/${dealID}/reviews`),
  userReviews: (handle: string) =>
    request<{ user: PublicUser; reviews: Review[]; summary: ReviewSummary }>(`/v1/users/${handle}/reviews`, { auth: false }),
  pendingReviews: () => request<{ deal_ids: string[] }>("/v1/my/reviews/pending"),

  // profile
  profile: (handle: string) => request<{ user: PublicUser }>(`/v1/users/${handle}`, { auth: false }),

  // notifications
  summary: () => request<Summary>("/v1/notifications/summary"),
  prefs: () => request<{ preferences: NotificationPrefs; devices: number }>("/v1/notifications/prefs"),
  setPrefs: (p: NotificationPrefs) =>
    request<{ preferences: NotificationPrefs }>("/v1/notifications/prefs", { method: "PUT", body: p }),
  pushKey: () => request<{ public_key: string }>("/v1/push/key"),
  subscribePush: (b: { endpoint: string; p256dh: string; auth: string }) =>
    request<{ subscription: unknown }>("/v1/push/subscribe", { method: "POST", body: b }),
  unsubscribePush: (endpoint: string) =>
    request<void>("/v1/push/unsubscribe", { method: "POST", body: { endpoint } }),

  // admin
  adminMetrics: () => request<AdminMetrics>("/v1/admin/metrics"),
  adminDisputes: () => request<{ disputes: Dispute[] }>("/v1/admin/disputes"),
  adminDeals: (state?: string) => request<{ deals: Deal[] }>(`/v1/admin/deals${qs({ state })}`),
  resolveDispute: (dealID: string, b: { outcome: "release" | "refund" | "partial"; release_paise?: number; note?: string }) =>
    request<{ deal: Deal; dispute: Dispute }>(`/v1/admin/deals/${dealID}/resolve`, { method: "POST", body: b }),
  blockUser: (id: string, blocked: boolean, reason?: string) =>
    request<{ blocked: boolean }>(`/v1/admin/users/${id}/block`, { method: "PUT", body: { blocked, reason } }),
};

// ── supporting types local to the client ─────────────────────────────────────

export interface PayoutAccount {
  id: string;
  user_id: string;
  kind: "bank" | "vpa";
  masked_value: string;
  verified_name: string;
  name_match_score: number;
  verified_at: string;
  is_default: boolean;
}

export interface ListingFilter {
  q?: string;
  category?: string;
  city?: string;
  min_paise?: number;
  max_paise?: number;
  condition?: string;
  verified?: boolean;
  sort?: "recent" | "price_asc" | "price_desc" | "relevant";
  limit?: number;
  offset?: number;
}

export interface NewListing {
  category_id: string;
  title: string;
  description?: string;
  price_paise: number;
  condition: string;
  city: string;
}

export interface NewDeal {
  listing_id?: string;
  buyer_id?: string;
  seller_id?: string;
  category_id?: string;
  title?: string;
  amount_paise: number;
  fee_payer?: "buyer" | "seller" | "split";
  mode: "meet" | "ship";
  inspection_hours?: number;
}

export interface AdminMetrics {
  users: number;
  verified_users: number;
  live_listings: number;
  open_deals: number;
  completed_deals: number;
  open_disputes: number;
  funds_held_paise: number;
  fees_earned_paise: number;
}

// ── display helpers ──────────────────────────────────────────────────────────

/** Money helper. Everything server-side is integer paise — never use floats. */
export function inr(paise: number): string {
  return "₹" + (paise / 100).toLocaleString("en-IN", { maximumFractionDigits: 0 });
}

/** Compact money for cards: ₹1.2L, ₹45k. */
export function inrShort(paise: number): string {
  const r = paise / 100;
  if (r >= 10_000_000) return `₹${(r / 10_000_000).toFixed(1).replace(/\.0$/, "")}Cr`;
  if (r >= 100_000) return `₹${(r / 100_000).toFixed(1).replace(/\.0$/, "")}L`;
  if (r >= 1_000) return `₹${Math.round(r / 1_000)}k`;
  return `₹${Math.round(r)}`;
}

/** "2 hours ago" — the marketplace reads as dead without relative times. */
export function ago(iso: string | null | undefined): string {
  if (!iso) return "";
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 2592000) return `${Math.floor(s / 86400)}d ago`;
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

/** Time remaining, for inspection windows and OTP expiry. */
export function until(iso: string | null | undefined): string {
  if (!iso) return "";
  const s = Math.floor((new Date(iso).getTime() - Date.now()) / 1000);
  if (s <= 0) return "expired";
  if (s < 3600) return `${Math.floor(s / 60)}m left`;
  if (s < 86400) return `${Math.floor(s / 3600)}h left`;
  return `${Math.floor(s / 86400)}d left`;
}

// ── design-system status mapping ─────────────────────────────────────────────
// Reuse without redesign: the DS already has a status vocabulary, so listing
// and deal states borrow it rather than inventing new colours.

export const listingStatusClass: Record<ListingStatus, string> = {
  draft: "pl-status-unlisted",
  live: "pl-status-available",
  reserved: "pl-status-reserved",
  sold: "pl-status-sold",
  expired: "pl-status-expired",
  removed: "pl-status-stock_out",
};

export const dealStateClass: Record<DealState, string> = {
  draft: "pl-status-unlisted",
  invited: "pl-status-unlisted",
  verified: "pl-status-unlisted",
  documented: "pl-status-unlisted",
  signed: "pl-status-unlisted",
  funded: "pl-status-reserved",
  handed_over: "pl-status-reserved",
  inspecting: "pl-status-reserved",
  released: "pl-status-sold",
  disputed: "pl-status-stock_out",
  refunded: "pl-status-expired",
  cancelled: "pl-status-unlisted",
};

/** Human label for a deal state — the raw enum is not user-facing copy. */
export const dealStateLabel: Record<DealState, string> = {
  draft: "Draft",
  invited: "Invited",
  verified: "Both verified",
  documented: "Terms set",
  signed: "Signed",
  funded: "Paid — held",
  handed_over: "Shipped",
  inspecting: "Inspecting",
  released: "Complete",
  disputed: "Disputed",
  refunded: "Refunded",
  cancelled: "Cancelled",
};

export const listingStatusLabel: Record<ListingStatus, string> = {
  draft: "Draft",
  live: "Live",
  reserved: "Reserved",
  sold: "Sold",
  expired: "Expired",
  removed: "Removed",
};
