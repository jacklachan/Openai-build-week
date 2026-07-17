import type { Interest } from "./types";
import type { PlanDraft, TravelerDraft } from "../components/plan-form";

export type ChatMessage = {
  sender: string;
  text: string;
};

export type ChatSignalKind = "dealbreaker" | "must-do" | "preference";

export type ChatSignal = ChatMessage & {
  id: string;
  kind: ChatSignalKind;
};

export type ChatIntake = {
  messages: ChatMessage[];
  participants: string[];
  signals: ChatSignal[];
};

export const TOKYO_GROUP_CHAT = `[08/09/2026, 18:12] Ravi: Tokyo is locked. I really want one proper summit day, ideally Mount Takao.\n[08/09/2026, 18:13] Priya: I am in for Tokyo, but I cannot do 6am starts every day or long walking days.\n[08/09/2026, 18:15] Mei: Please do not make this a museum-only trip. I need one anime or Akihabara night.\n[08/09/2026, 18:17] Priya: I would love one special vegetarian dinner, then I am happy keeping the rest casual.\n[08/09/2026, 18:19] Ravi: Fine with that if we protect the hike.\n[08/09/2026, 18:21] Mei: Late evening is fine for me, but I do not need nightlife every night.`;

const androidMessage = /^\d{1,2}[/.\-]\d{1,2}[/.\-]\d{2,4},?\s+\d{1,2}:\d{2}(?::\d{2})?\s*(?:AM|PM|am|pm)?\s+-\s+([^:]+):\s*(.+)$/;
const iosMessage = /^\[[^\]]+\]\s*([^:]+):\s*(.+)$/;
const systemMessage = /(?:messages and calls are end-to-end encrypted|created group|added|removed|joined using)/i;

const interestSignals: Record<Interest, RegExp> = {
  adventure: /\b(hike|hiking|summit|trek|adventure|climb)\b/i,
  anime: /\b(anime|manga|akihabara|gaming)\b/i,
  beach: /\b(beach|coast|sea|ocean)\b/i,
  city: /\b(city|urban|skyline|neighbourhood|neighborhood)\b/i,
  culture: /\b(museum|temple|culture|historic|history)\b/i,
  food: /\b(food|dinner|restaurant|vegetarian|vegan|ramen|cafe|café)\b/i,
  history: /\b(history|historic|heritage)\b/i,
  nature: /\b(nature|garden|park|mountain|hike|hiking|summit)\b/i,
  nightlife: /\b(nightlife|night|late evening|after dark|bar|club)\b/i,
  relaxation: /\b(relax|slow|easy|quiet|spa)\b/i,
  shopping: /\b(shop|shopping|market|boutique)\b/i,
};

function getSignalKind(text: string): ChatSignalKind | undefined {
  if (/\b(can(?:not|'t)|do not|don't|avoid|not doing|no early|no long)\b/i.test(text)) return "dealbreaker";
  if (/\b(must|need|really want|have to|non-negotiable|cannot leave without)\b/i.test(text)) return "must-do";
  if (/\b(prefer|would love|like|fine with|happy|ideally)\b/i.test(text)) return "preference";
  return undefined;
}

/** Parses a user-exported WhatsApp transcript without uploading it anywhere. */
export function parseWhatsAppExport(text: string): ChatMessage[] {
  const messages: ChatMessage[] = [];

  for (const rawLine of text.replace(/\r\n/g, "\n").split("\n")) {
    const line = rawLine.replace(/^\u200e/, "").trim();
    const match = androidMessage.exec(line) ?? iosMessage.exec(line);
    if (match) {
      const sender = match[1]!.trim();
      const message = match[2]!.trim();
      if (sender && message && !systemMessage.test(message)) messages.push({ sender, text: message });
      continue;
    }

    const previous = messages.at(-1);
    if (previous && line && !systemMessage.test(line)) previous.text = `${previous.text} ${line}`.trim();
  }

  return messages;
}

export function analyzeChat(messages: ChatMessage[]): ChatIntake {
  const participants = [...new Set(messages.map((message) => message.sender))];
  const signals = messages.flatMap((message, index) => {
    const kind = getSignalKind(message.text);
    return kind ? [{ ...message, id: `${index}-${message.sender}`, kind }] : [];
  });

  return { messages, participants, signals };
}

function interestsFromMessages(messages: ChatMessage[]) {
  return (Object.entries(interestSignals) as [Interest, RegExp][])
    .filter(([, pattern]) => messages.some((message) => pattern.test(message.text)))
    .map(([interest]) => interest);
}

function paceFromMessages(messages: ChatMessage[]): TravelerDraft["pace"] {
  const text = messages.map((message) => message.text).join(" ");
  if (/\b(no early|cannot do|can't do|slow|long walking|easy)\b/i.test(text)) return "slow";
  if (/\b(hike|summit|packed|adventure|trek)\b/i.test(text)) return "packed";
  return "moderate";
}

function textFor(messages: ChatMessage[], kind: ChatSignalKind) {
  return messages
    .filter((message) => getSignalKind(message.text) === kind)
    .map((message) => message.text)
    .join(", ");
}

/** Creates an editable draft. Signals stay visible to the user; nothing is presented as an unverified fact. */
export function createPlanDraftFromChat(intake: ChatIntake, current: PlanDraft): PlanDraft {
  const travelers = intake.participants.slice(0, 8).map((name, index) => {
    const messages = intake.messages.filter((message) => message.sender === name);
    return {
      id: `chat-traveler-${index + 1}`,
      name,
      budgetContribution: "",
      pace: paceFromMessages(messages),
      interests: interestsFromMessages(messages),
      dietary: /\b(vegetarian|vegan)\b/i.test(messages.map((message) => message.text).join(" ")) ? "vegetarian" : "",
      accessibility: /\b(long walking|walk)\b/i.test(messages.map((message) => message.text).join(" ")) ? "avoid long walks" : "",
      mustDo: textFor(messages, "must-do"),
      dealbreakers: textFor(messages, "dealbreaker"),
    } satisfies TravelerDraft;
  });

  return {
    ...current,
    travelers: travelers.length ? travelers : current.travelers,
  };
}
