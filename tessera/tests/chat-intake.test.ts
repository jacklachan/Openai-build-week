import assert from "node:assert/strict";
import test from "node:test";

import { createPlanDraft } from "../components/plan-form";
import { analyzeChat, createPlanDraftFromChat, getChatDecisionQuestion, parseWhatsAppExport, TOKYO_GROUP_CHAT } from "../lib/chat-intake";

test("parses a WhatsApp export and keeps only human decision signals", () => {
  const messages = parseWhatsAppExport(`${TOKYO_GROUP_CHAT}\nA continuation of the last thought.`);
  const intake = analyzeChat(messages);

  assert.equal(intake.participants.length, 3);
  assert.deepEqual(intake.participants, ["Ravi", "Priya", "Mei"]);
  assert.ok(intake.signals.some((signal) => signal.kind === "must-do" && signal.sender === "Ravi"));
  assert.ok(intake.signals.some((signal) => signal.kind === "dealbreaker" && signal.sender === "Priya"));
  assert.match(messages.at(-1)?.text ?? "", /continuation/);
  assert.deepEqual(getChatDecisionQuestion(intake), {
    protectedTraveler: "Ravi",
    question: "Priya, what is the smallest compromise you could accept to protect Ravi's named must-do?",
    source: "Priya: “I am in for Tokyo, but I cannot do 6am starts every day or long walking days.” · Ravi: “Tokyo is locked. I really want one proper summit day, ideally Mount Takao.”",
    traveler: "Priya",
  });
});

test("turns a chat intake into an editable group-planning draft", () => {
  const intake = analyzeChat(parseWhatsAppExport(TOKYO_GROUP_CHAT));
  const draft = createPlanDraftFromChat(intake, { ...createPlanDraft(), destination: "Tokyo, Japan" });
  const priya = draft.travelers.find((traveler) => traveler.name === "Priya");
  const ravi = draft.travelers.find((traveler) => traveler.name === "Ravi");

  assert.equal(draft.destination, "Tokyo, Japan");
  assert.equal(draft.travelers.length, 3);
  assert.equal(priya?.pace, "slow");
  assert.match(priya?.dealbreakers ?? "", /cannot do 6am starts/i);
  assert.ok(ravi?.interests.includes("adventure"));
});

test("parses a short browser voice-note transcript as an editable signal", () => {
  const intake = analyzeChat(parseWhatsAppExport("Voice note: I cannot do early starts, but I really want one special dinner."));

  assert.deepEqual(intake.participants, ["Voice note"]);
  assert.equal(intake.signals[0]?.kind, "dealbreaker");
});
