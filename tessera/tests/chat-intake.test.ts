import assert from "node:assert/strict";
import test from "node:test";

import { createPlanDraft } from "../components/plan-form";
import { analyzeChat, createPlanDraftFromChat, getChatDecisionQuestion, parseWhatsAppExport, TOKYO_GROUP_CHAT } from "../lib/chat-intake";

test("parses a WhatsApp export and keeps only human decision signals", () => {
  const messages = parseWhatsAppExport(`${TOKYO_GROUP_CHAT}\nA continuation of the last thought.`);
  const intake = analyzeChat(messages);
  const question = getChatDecisionQuestion(intake);

  assert.equal(intake.participants.length, 3);
  assert.deepEqual(intake.participants, ["Ravi", "Priya", "Mei"]);
  assert.ok(intake.signals.some((signal) => signal.kind === "must-do" && signal.sender === "Ravi"));
  assert.ok(intake.signals.some((signal) => signal.kind === "dealbreaker" && signal.sender === "Priya"));
  assert.match(messages.at(-1)?.text ?? "", /continuation/);
  assert.equal(question?.protectedTraveler, "Ravi");
  assert.equal(question?.traveler, "Priya");
  assert.match(question?.source ?? "", /Mount Fuji sunrise/);
  assert.match(question?.source ?? "", /cannot do 6am starts/);
});

test("turns a chat intake into an editable group-planning draft", () => {
  const intake = analyzeChat(parseWhatsAppExport(TOKYO_GROUP_CHAT));
  const draft = createPlanDraftFromChat(intake, { ...createPlanDraft(), destination: "Japan" });
  const priya = draft.travelers.find((traveler) => traveler.name === "Priya");
  const ravi = draft.travelers.find((traveler) => traveler.name === "Ravi");

  assert.equal(draft.destination, "Japan");
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
