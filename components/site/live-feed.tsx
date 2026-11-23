"use client";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { AlertRow } from "@/components/site/alert-row";
import type { FeedEvent } from "@/lib/data";

/**
 * Feed die zichzelf ververst. Nieuwe events schuiven van boven in en pingen
 * (de signatuur-animatie). Pollen via /api/feed; de server bepaalt de vertraging.
 */
export function LiveFeed({
  initial,
  query = "",
  pollMs = 15_000,
  limit = 50,
  compactMode = false,
  empty,
}: {
  initial: FeedEvent[];
  query?: string;
  pollMs?: number;
  limit?: number;
  compactMode?: boolean;
  empty?: React.ReactNode;
}) {
  const [events, setEvents] = useState(initial);
  const [fresh, setFresh] = useState<Set<string>>(new Set());
  const known = useRef(new Set(initial.map((e) => e.id)));
  const reduce = useReducedMotion();

  useEffect(() => {
    setEvents(initial);
    known.current = new Set(initial.map((e) => e.id));
  }, [initial]);

  useEffect(() => {
    let stop = false;
    const tick = async () => {
      if (document.hidden) return;
      try {
        const res = await fetch(`/api/feed?limit=${limit}${query ? `&${query}` : ""}`, { cache: "no-store" });
        if (!res.ok) return;
        const { events: next } = (await res.json()) as { events: FeedEvent[] };
        if (stop) return;
        const added = next.filter((e) => !known.current.has(e.id)).map((e) => e.id);
        if (added.length) {
          for (const id of added) known.current.add(id);
          setFresh(new Set(added));
        }
        setEvents(next);
      } catch {
        /* netwerkfout: volgende tick opnieuw */
      }
    };
    const id = setInterval(tick, pollMs);
    return () => {
      stop = true;
      clearInterval(id);
    };
  }, [query, pollMs, limit]);

  if (!events.length) return <>{empty}</>;

  return (
    <div role="feed" aria-live="polite" aria-busy="false" className="divide-y divide-line">
      <AnimatePresence initial={false}>
        {events.map((e) => (
          <motion.div
            key={e.id}
            layout={reduce ? false : "position"}
            initial={reduce ? false : { opacity: 0, y: -8, filter: "blur(3px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
          >
            <AlertRow e={e} fresh={fresh.has(e.id)} compactMode={compactMode} />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
