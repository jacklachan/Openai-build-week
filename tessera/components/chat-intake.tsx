"use client";

import { useRef, useState, type ChangeEvent } from "react";

import {
  analyzeChat,
  createPlanDraftFromChat,
  getChatDecisionQuestion,
  parseWhatsAppExport,
  TOKYO_GROUP_CHAT,
  type ChatIntake,
} from "../lib/chat-intake";
import type { PlanDraft } from "./plan-form";

type ChatIntakeProps = {
  disabled?: boolean;
  draft: PlanDraft;
  onDraftChange: (draft: PlanDraft) => void;
};

const signalLabel = {
  dealbreaker: "Cannot accept",
  "must-do": "Must protect",
  preference: "Would like",
} as const;

export function ChatIntake({ disabled = false, draft, onDraftChange }: ChatIntakeProps) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [text, setText] = useState("");
  const [intake, setIntake] = useState<ChatIntake | null>(null);
  const [error, setError] = useState("");
  const decisionQuestion = intake ? getChatDecisionQuestion(intake) : null;

  function inspectChat(nextText: string) {
    const messages = parseWhatsAppExport(nextText);
    setText(nextText);
    if (!messages.length) {
      setIntake(null);
      setError("Tessera could not find WhatsApp-style messages. Paste an exported .txt conversation and try again.");
      return;
    }

    setError("");
    setIntake(analyzeChat(messages));
  }

  function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => inspectChat(typeof reader.result === "string" ? reader.result : "");
    reader.readAsText(file);
  }

  function reviewBrief() {
    if (!intake) return;
    onDraftChange(createPlanDraftFromChat(intake, draft));
    document.getElementById("plan-form")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <section className="chatIntake" aria-labelledby="chat-intake-title">
      <header>
        <p>From group chat to group agreement</p>
        <h2 id="chat-intake-title">Start with what everyone already said.</h2>
        <span>Private import · review before planning</span>
      </header>

      <div className="chatIntakeActions">
        <button disabled={disabled} onClick={() => fileInput.current?.click()} type="button">Import WhatsApp .txt</button>
        <button disabled={disabled} onClick={() => inspectChat(TOKYO_GROUP_CHAT)} type="button">Try the Tokyo chat</button>
        <input accept="text/plain,.txt" aria-label="Import a WhatsApp chat export" disabled={disabled} onChange={handleFile} ref={fileInput} type="file" />
      </div>

      <label className="chatIntakePaste" htmlFor="chat-export">
        Or paste an exported conversation
        <textarea
          id="chat-export"
          disabled={disabled}
          onChange={(event) => setText(event.target.value)}
          placeholder="12/09/2026, 18:12 - Ravi: I really want one proper summit day..."
          value={text}
        />
      </label>
      <button className="chatIntakeAnalyze" disabled={disabled || !text.trim()} onClick={() => inspectChat(text)} type="button">
        Find the real constraints
      </button>
      {error ? <p className="chatIntakeError" role="alert">{error}</p> : null}

      {intake ? (
        <div className="chatIntakeResult" aria-live="polite">
          <p>{`${intake.messages.length} messages · ${intake.participants.length} travelers · ${intake.signals.length} decision signals`}</p>
          <div className="chatSignalList">
            {intake.signals.slice(0, 5).map((signal) => (
              <article key={signal.id}>
                <span>{signalLabel[signal.kind]}</span>
                <strong>{signal.sender}</strong>
                <p>{signal.text}</p>
              </article>
            ))}
          </div>
          {decisionQuestion ? (
            <div className="chatOneQuestion">
              <span>The one question Tessera would ask</span>
              <strong>{decisionQuestion.question}</strong>
              <p>{decisionQuestion.source}</p>
            </div>
          ) : null}
          <button className="chatIntakeApply" onClick={reviewBrief} type="button">Review this group brief</button>
        </div>
      ) : null}
    </section>
  );
}
