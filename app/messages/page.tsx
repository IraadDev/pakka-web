"use client";

/** Inbox (route /messages). Uses the DS conversation-list vocabulary. */
import Link from "next/link";
import * as React from "react";
import { api, ago } from "@/lib/api";
import type { Thread } from "@/lib/types";
import { useRequireAuth } from "@/lib/session";
import { useInboxStream } from "@/lib/realtime";
import { Avatar, Empty, Page, Spinner, cx } from "@/components/ui";

export default function MessagesPage() {
  const { user, loading: authLoading } = useRequireAuth();
  const [threads, setThreads] = React.useState<Thread[]>([]);
  const [loading, setLoading] = React.useState(true);

  const load = React.useCallback(async () => {
    if (!user) return;
    try {
      setThreads((await api.threads()).threads);
    } finally {
      setLoading(false);
    }
  }, [user]);

  React.useEffect(() => { void load(); }, [load]);

  // A new message reorders the inbox without a refresh.
  useInboxStream(React.useCallback((e) => {
    if (e.type === "message.created" || e.type === "thread.opened" || e.type.startsWith("offer.")) {
      void load();
    }
  }, [load]));

  if (authLoading || loading) return <Page width="read"><Spinner /></Page>;
  if (!user) return null;

  return (
    <Page width="read">
      <h1 className="display-m">Messages</h1>

      {threads.length === 0 ? (
        <Empty title="No conversations yet" action={<Link className="pl-btn pl-btn-primary" href="/">Browse listings</Link>}>
          Message a seller and it will appear here.
        </Empty>
      ) : (
        <div className="dsc-conv-list">
          {threads.map((t) => (
            <Link
              key={t.id}
              href={`/messages/${t.id}`}
              className={cx("dsc-conv", t.unread_count > 0 && "is-unread")}
            >
              <Avatar name={t.other_name} />
              <div className="dsc-conv-meta">
                <div className="dsc-conv-top">
                  <span className="dsc-conv-name">{t.other_name ?? "Someone"}</span>
                  <span className="dsc-conv-time">{ago(t.last_at ?? t.created_at)}</span>
                </div>
                {t.listing_title && <div className="dsc-conv-type">{t.listing_title}</div>}
                <div className="dsc-conv-prev">{t.last_message ?? "No messages yet"}</div>
              </div>
              {t.unread_count > 0 && <span className="dsc-unread">{t.unread_count}</span>}
            </Link>
          ))}
        </div>
      )}
    </Page>
  );
}
