import type { AgreementEntry } from "./studio";
import type { Trip } from "./types";

function escapeXml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&apos;",
  })[character]!);
}

function crop(value: string, maxLength: number) {
  return value.length > maxLength ? `${value.slice(0, maxLength - 1).trimEnd()}…` : value;
}

function formatCurrency(value: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    currency,
    maximumFractionDigits: 0,
    style: "currency",
  }).format(value);
}

/** Creates a portable, dependency-free visual receipt for the current group agreement. */
export function createPactCardSvg(trip: Trip, agreement: AgreementEntry[]) {
  const entries = agreement.slice(0, 4);
  const rows = entries.map((entry, index) => {
    const y = 498 + index * 148;
    return `<g>
      <circle cx="84" cy="${y - 12}" r="23" fill="#efc678" />
      <text x="84" y="${y - 5}" fill="#211744" font-family="Arial, sans-serif" font-size="19" font-weight="700" text-anchor="middle">${index + 1}</text>
      <text x="132" y="${y - 27}" fill="#c5b8ff" font-family="Arial, sans-serif" font-size="18" font-weight="700" letter-spacing="2">${escapeXml(crop(entry.traveler.name.toUpperCase(), 26))}</text>
      <text x="132" y="${y + 12}" fill="#f8f5f0" font-family="Georgia, serif" font-size="30">${escapeXml(crop(entry.mustDo, 52))}</text>
      <text x="132" y="${y + 46}" fill="#c8d2e0" font-family="Arial, sans-serif" font-size="17">${escapeXml(crop(entry.concession, 91))}</text>
      <line x1="84" x2="996" y1="${y + 76}" y2="${y + 76}" stroke="#ffffff" stroke-opacity="0.15" />
    </g>`;
  }).join("\n");

  const budget = formatCurrency(trip.budget.total, trip.constraints.currency);
  const remaining = Math.max(0, 4 - entries.length);
  const footerY = 498 + Math.max(entries.length, 1) * 148 + remaining * 30;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1350" viewBox="0 0 1080 1350" role="img" aria-label="Tessera group pact for ${escapeXml(trip.constraints.destination)}">
  <defs>
    <linearGradient id="night" x1="0" x2="1" y1="0" y2="1"><stop stop-color="#091827"/><stop offset="1" stop-color="#30215a"/></linearGradient>
    <radialGradient id="glow" cx="0.82" cy="0.15" r="0.7"><stop stop-color="#8367f7" stop-opacity="0.56"/><stop offset="1" stop-color="#8367f7" stop-opacity="0"/></radialGradient>
  </defs>
  <rect width="1080" height="1350" fill="url(#night)"/>
  <rect width="1080" height="1350" fill="url(#glow)"/>
  <path d="M0 252 C208 184 350 330 548 258 S855 148 1080 230" fill="none" stroke="#efc678" stroke-opacity="0.42" stroke-width="2"/>
  <text x="84" y="108" fill="#efc678" font-family="Arial, sans-serif" font-size="20" font-weight="700" letter-spacing="4">TESSERA / GROUP PACT</text>
  <text x="84" y="190" fill="#f8f5f0" font-family="Georgia, serif" font-size="68">${escapeXml(crop(trip.constraints.destination, 34))}</text>
  <text x="84" y="232" fill="#c8d2e0" font-family="Arial, sans-serif" font-size="21">${trip.constraints.days}-day trip · ${entries.length} travelers made the compromise visible</text>
  <rect x="84" y="302" width="912" height="126" rx="18" fill="#ffffff" fill-opacity="0.075" stroke="#ffffff" stroke-opacity="0.19"/>
  <text x="116" y="350" fill="#c5b8ff" font-family="Arial, sans-serif" font-size="17" font-weight="700" letter-spacing="2">THE AGREEMENT</text>
  <text x="116" y="391" fill="#f8f5f0" font-family="Georgia, serif" font-size="29">Nobody’s must-do is hidden in the itinerary.</text>
  ${rows}
  <rect x="84" y="${footerY + 8}" width="912" height="134" rx="18" fill="#efc678"/>
  <text x="116" y="${footerY + 53}" fill="#211744" font-family="Arial, sans-serif" font-size="17" font-weight="700" letter-spacing="2">ESTIMATED GROUP TOTAL</text>
  <text x="116" y="${footerY + 104}" fill="#211744" font-family="Georgia, serif" font-size="42" font-weight="700">${escapeXml(budget)}</text>
  <text x="996" y="${footerY + 104}" fill="#211744" font-family="Arial, sans-serif" font-size="18" font-weight="700" text-anchor="end">PLAN VERSION ${trip.version}</text>
  <text x="84" y="1262" fill="#c8d2e0" font-family="Arial, sans-serif" font-size="17">A shared decision receipt — built to be challenged before booking.</text>
  <text x="84" y="1302" fill="#efc678" font-family="Arial, sans-serif" font-size="16" font-weight="700" letter-spacing="3">TESSERA</text>
</svg>`;
}

export function getPactCardFilename(destination: string) {
  return `tessera-${destination.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-pact-card.svg`;
}
