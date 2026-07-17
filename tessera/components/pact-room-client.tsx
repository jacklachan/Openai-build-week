"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import type { PactRoomEvent, PactRoomSnapshot } from "@/lib/pact-room";

function formatTime(iso: string) {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "Just now" : date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function readPactRoomToken() {
  if (typeof window === "undefined") return "";
  return new URLSearchParams(window.location.hash.slice(1)).get("token") ?? "";
}

export function PactRoomClient({ roomId }: { roomId: string }) {
  const [token] = useState(readPactRoomToken);
  const [snapshot, setSnapshot] = useState<PactRoomSnapshot | null>(null);
  const [status, setStatus] = useState("Opening private room…");
  const [isSending, setIsSending] = useState(false);
  const statusMessage = token ? status : "This private link is incomplete. Ask the organizer to send the full invite again.";

  const loadRoom = useCallback(async (inviteToken: string, quiet = false) => {
    if (!inviteToken) return;
    try {
      const response = await fetch(`/api/rooms/${encodeURIComponent(roomId)}`, {
        cache: "no-store",
        headers: { Authorization: `Bearer ${inviteToken}` },
      });
      const payload = await response.json() as PactRoomSnapshot & { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Unable to open this Pact Room.");
      setSnapshot(payload);
      setStatus(quiet ? "" : "Private room is up to date.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to open this Pact Room.");
    }
  }, [roomId]);

  useEffect(() => {
    if (!token) return;
    const initialTimer = window.setTimeout(() => void loadRoom(token), 0);
    const timer = window.setInterval(() => void loadRoom(token, true), 5000);
    return () => {
      window.clearTimeout(initialTimer);
      window.clearInterval(timer);
    };
  }, [loadRoom, token]);

  async function sendDecision(action: PactRoomEvent["action"]) {
    if (!token) return;
    setIsSending(true);
    try {
      const response = await fetch(`/api/rooms/${encodeURIComponent(roomId)}`, {
        body: JSON.stringify({ action }),
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        method: "POST",
      });
      const payload = await response.json() as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Unable to save your decision.");
      setStatus(action === "accepted" ? "Your yes is visible to the room." : "Your concern is visible to the room.");
      await loadRoom(token, true);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to save your decision.");
    } finally {
      setIsSending(false);
    }
  }

  return (
    <main className="pactRoomShell">
      <header className="pactRoomHero">
        <Link href="/">Tessera</Link>
        <p>PRIVATE PACT ROOM</p>
        <h1>{snapshot ? snapshot.trip.constraints.destination : "Opening your agreement"}</h1>
        <span>{snapshot?.role === "organizer" ? "Organizer view" : "Traveler check-in"}</span>
      </header>

      {snapshot ? (
        <div className="pactRoomGrid">
          <section className="pactRoomPromise" aria-labelledby="pact-promises-title">
            <p>THE AGREEMENT</p>
            <h2 id="pact-promises-title">What everyone is protecting.</h2>
            <div className="pactRoomPromiseList">
              {snapshot.agreement.map((entry) => (
                <article key={entry.traveler.id}>
                  <span>{entry.traveler.name}</span>
                  <strong>{entry.mustDo}</strong>
                  <p>{entry.concession}</p>
                </article>
              ))}
            </div>
          </section>

          <aside className="pactRoomActivity" aria-live="polite">
            <p>LIVE DECISION FEED</p>
            <h2>{snapshot.events.length ? "The room is moving." : "No decisions yet."}</h2>
            {snapshot.role === "traveler" ? (
              <div className="pactRoomActions">
                <button disabled={isSending} onClick={() => void sendDecision("accepted")} type="button">I&apos;m in</button>
                <button disabled={isSending} onClick={() => void sendDecision("concern")} type="button">Flag a concern</button>
              </div>
            ) : (
              <p className="pactRoomHint">Share the traveler-specific invite links. Each person can only record their own decision.</p>
            )}
            <ol>
              {snapshot.events.map((event) => (
                <li className={`pactRoomEvent pactRoomEvent-${event.action}`} key={event.id}>
                  <span>{formatTime(event.createdAt)}</span>
                  <p>{event.message}</p>
                </li>
              ))}
            </ol>
          </aside>
        </div>
      ) : null}
      {statusMessage ? <p className="pactRoomStatus" role="status">{statusMessage}</p> : null}
      <p className="pactRoomPrivacy">Invite tokens stay in the link fragment, never in this page request. The room refreshes every five seconds.</p>
    </main>
  );
}
