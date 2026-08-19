"use client";

/**
 * Thread + offers (route /messages/[id]). FR-3.1, FR-3.2.
 *
 * Offers are structured amounts rather than free text, because "ok 22k then"
 * in a chat log is not something a deal can be built on. Accepting one is what
 * creates the deal.
 */
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import * as React from "react";
import { ApiError, api, ago, inr } from "@/lib/api";
import type { Message, Offer, Thread } from "@/lib/types";
import { useRequireAuth } from "@/lib/session";
import { useStream } from "@/lib/realtime";
import {
  Avatar, Button, Card, Input, Note, Page, Spinner, cx,
} from "@/components/ui";

export default function ThreadPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user, loading: authLoading } = useRequireAuth();

  const [thread, setThread] = React.useState<Thread | null>(null);
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [offers, setOffers] = React.useState<Offer[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [body, setBody] = React.useState("");
  const [amount, setAmount] = React.useState("");
  const [offering, setOffering] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  const bottom = React.useRef<HTMLDivElement>(null);

  const load = React.useCallback(async () => {
    try {
      const d = await api.thread(id);
      setThread(d.thread);
      setMessages(d.messages);
      setOffers(d.offers);
    } catch {
      setThread(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  React.useEffect(() => { if (user) void load(); }, [user, load]);

  // Opening the thread clears its unread count.
  React.useEffect(() => {
    if (user && thread) void api.markRead(id).catch(() => {});
  }, [user, thread, id]);

  // Live: the counterparty's messages and offers arrive without polling.
  useStream(user ? `/v1/threads/${id}/stream` : null, React.useCallback((e) => {
    if (e.type === "message.created") {
      setMessages((m) => {
        const msg = e.data as Message;
        return m.some((x) => x.id === msg.id) ? m : [...m, msg];
      });
      void api.markRead(id).catch(() => {});
    }
    if (e.type.startsWith("offer.")) void load();
  }, [id, load]));

  React.useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    const text = body;
    setBody(""); // clear immediately — a laggy input feels broken
    try {
      const { message } = await api.postMessage(id, text);
      setMessages((m) => (m.some((x) => x.id === message.id) ? m : [...m, message]));
    } catch (err) {
      setBody(text);
      setError(err instanceof ApiError ? err.message : "Could not send.");
    }
  }

  async function makeOffer(e: React.FormEvent) {
    e.preventDefault();
    const rupees = Number(amount);
    if (!rupees || rupees <= 0) return;
    setBusy(true);
    setError(null);
    try {
      await api.makeOffer(id, Math.round(rupees * 100)); // rupees → paise
      setAmount("");
      setOffering(false);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not make the offer.");
    } finally {
      setBusy(false);
    }
  }

  async function accept(offer: Offer) {
    setBusy(true);
    setError(null);
    try {
      await api.acceptOffer(offer.id);
      // Accepting is the moment a deal exists — take them straight to it.
      const { deal } = await api.createDeal({
        listing_id: thread?.listing_id ?? undefined,
        amount_paise: offer.amount_paise,
        mode: "meet",
      });
      router.push(`/deals/${deal.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not accept.");
      setBusy(false);
    }
  }

  if (authLoading || loading) return <Page width="read"><Spinner /></Page>;
  if (!user) return null;
  if (!thread) return <Page width="read"><Note tone="danger">Conversation not found.</Note></Page>;

  const openOffer = offers.find((o) => o.status === "open");
  const other = thread.buyer_id === user.id ? "seller" : "buyer";

  return (
    <Page width="read">
      <div className="dsc-crumbs">
        <Link href="/messages">Messages</Link>
        {thread.listing_id && <> · <Link href={`/i/${thread.listing_id}`}>{thread.listing_title}</Link></>}
      </div>

      <div className="dsc-chat">
        {messages.map((m) => {
          const mine = m.sender_id === user.id;
          const offer = m.offer_id ? offers.find((o) => o.id === m.offer_id) : undefined;

          if (offer) {
            return (
              <div key={m.id} className={cx("dsc-offer", mine && "is-self")}>
                <div className="dsc-offer-head">{mine ? "You offered" : "They offered"}</div>
                <div className="dsc-offer-price">{inr(offer.amount_paise)}</div>
                <div className="dsc-offer-foot">
                  <span className={cx("dsc-offer-state", `is-${offer.status}`)}>{offer.status}</span>
                  <span className="dsc-msgmeta">{ago(offer.created_at)}</span>
                </div>
                {!mine && offer.status === "open" && (
                  <div className="acts">
                    <Button size="sm" onClick={() => accept(offer)} disabled={busy}>Accept</Button>
                    <Button size="sm" variant="ghost" disabled={busy}
                            onClick={() => api.declineOffer(offer.id).then(load)}>
                      Decline
                    </Button>
                  </div>
                )}
              </div>
            );
          }

          return (
            <div key={m.id} className={cx("dsc-msg", mine && "is-self")}>
              {!mine && <Avatar name={thread.other_name} />}
              <div className="dsc-bubble">
                {m.body}
                <span className="dsc-msgmeta">{ago(m.created_at)}</span>
              </div>
            </div>
          );
        })}
        <div ref={bottom} />
      </div>

      {error && <Note tone="danger">{error}</Note>}

      {openOffer && openOffer.from_id !== user.id && (
        <Card>
          <strong>The {other} offered {inr(openOffer.amount_paise)}</strong>
          <p className="text-2">
            Accepting creates a protected deal. Your money is held until handover.
          </p>
          <Button onClick={() => accept(openOffer)} disabled={busy}>
            Accept {inr(openOffer.amount_paise)}
          </Button>
        </Card>
      )}

      {offering ? (
        <form className="pl-toolbar" onSubmit={makeOffer}>
          <Input
            type="number" inputMode="numeric" autoFocus placeholder="Amount in ₹"
            value={amount} onChange={(e) => setAmount(e.target.value)}
          />
          <Button type="submit" disabled={busy}>Send offer</Button>
          <Button type="button" variant="ghost" onClick={() => setOffering(false)}>Cancel</Button>
        </form>
      ) : (
        <form className="pl-toolbar" onSubmit={send}>
          <Input
            value={body} onChange={(e) => setBody(e.target.value)}
            placeholder="Write a message…" aria-label="Message"
          />
          <Button type="submit" disabled={!body.trim()}>Send</Button>
          <Button type="button" variant="secondary" onClick={() => setOffering(true)}>Make an offer</Button>
        </form>
      )}
    </Page>
  );
}
