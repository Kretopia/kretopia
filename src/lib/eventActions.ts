// Utilities for IRL event guest actions: Add to Calendar (.ics) + Get Directions deep-links.
// Designed to be friendly for non-technical and older users — one-tap, native handlers.

interface IcsEvent {
  id: string;
  title: string;
  description?: string;
  startTime: string; // ISO
  endTime?: string | null; // ISO
  venueName?: string | null;
  venueAddress?: string | null;
  url?: string;
}

const pad = (n: number) => String(n).padStart(2, "0");

const toIcsDate = (iso: string) => {
  const d = new Date(iso);
  return (
    d.getUTCFullYear().toString() +
    pad(d.getUTCMonth() + 1) +
    pad(d.getUTCDate()) +
    "T" +
    pad(d.getUTCHours()) +
    pad(d.getUTCMinutes()) +
    pad(d.getUTCSeconds()) +
    "Z"
  );
};

const escapeIcs = (text: string) =>
  text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");

/**
 * Build an .ics file string and trigger a download.
 * Works on iOS (opens Calendar), Android (opens Calendar), Outlook, Google Calendar import.
 */
export const downloadIcs = (event: IcsEvent) => {
  const dtStart = toIcsDate(event.startTime);
  // Default to +2h if no end time given
  const endIso =
    event.endTime ||
    new Date(new Date(event.startTime).getTime() + 2 * 60 * 60 * 1000).toISOString();
  const dtEnd = toIcsDate(endIso);
  const dtStamp = toIcsDate(new Date().toISOString());

  const location = [event.venueName, event.venueAddress].filter(Boolean).join(", ");
  const descParts: string[] = [];
  if (event.description) descParts.push(event.description);
  if (event.url) descParts.push(`\n\nDetails: ${event.url}`);

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//ThriveIN//Events//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${event.id}@thrivein.io`,
    `DTSTAMP:${dtStamp}`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:${escapeIcs(event.title)}`,
    descParts.length ? `DESCRIPTION:${escapeIcs(descParts.join(""))}` : "",
    location ? `LOCATION:${escapeIcs(location)}` : "",
    event.url ? `URL:${event.url}` : "",
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter(Boolean);

  const blob = new Blob([lines.join("\r\n")], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${event.title.replace(/[^a-z0-9]/gi, "-").toLowerCase().slice(0, 40)}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

/**
 * Open native maps app with directions to the venue.
 * iOS → Apple Maps, everywhere else → Google Maps. Both support web fallback.
 */
export const openDirections = (venueAddress?: string | null, venueName?: string | null) => {
  const query = encodeURIComponent(venueAddress || venueName || "");
  if (!query) return;

  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
  const url = isIOS
    ? `https://maps.apple.com/?q=${query}`
    : `https://www.google.com/maps/search/?api=1&query=${query}`;

  window.open(url, "_blank", "noopener,noreferrer");
};
