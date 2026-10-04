/* ==========================================================================
   The thirteen stamps: what students see on the front desk. The answers are
   not here; they live in the database, where no browser can read them.
   HINTS_FROM must match the number in database.rules.json.
   ========================================================================== */

export const HOTEL_URL = "../meridian/";

export const HINTS_FROM = 1791410400000; // Thu 8 Oct 2026, 00:00 CEST
export const DEADLINE = 1791755999000;   // Sun 11 Oct 2026, 23:59:59 CEST

// Codes are compared without case, spaces or dashes: "dust-4q7k" = "DUST4Q7K".
export const normalise = (code) => String(code || "").toUpperCase().replace(/[^A-Z0-9]/g, "");

export const STAMPS = [
  { id: "s01", title: "The webmaster", riddle: "The old webmaster left a note for whoever came after. It isn't on the page, but it is in it." },
  { id: "s02", title: "Opening night", riddle: "The lobby photo describes itself to guests who can't see it." },
  { id: "s03", title: "The staff entrance", riddle: "The staff entrance has no handle for a mouse." },
  { id: "s04", title: "The booking card", riddle: "Every booking arrives at the front desk without a room. Find out what the card forgets to send." },
  { id: "s05", title: "The room board", riddle: "Floor three is fully booked. If the east wing were empty, the board would show a tag for every free room. Read them in order." },
  { id: "s06", title: "Do not disturb", riddle: "Someone wrote on a door hanger. Two style rules argue about its colour, and the more specific one wins." },
  { id: "s07", title: "The study", riddle: "Every old hotel hides a safe behind a painting." },
  { id: "s08", title: "The mosaic", riddle: "The architect drew the lift-lobby mosaic as a grid. A later webmaster stacked the tiles instead. Lay them out the architect's way, then read left to right, top to bottom." },
  { id: "s09", title: "Night rounds", riddle: "The night porter reads the floor-three board on a small phone, with the lights off." },
  { id: "s10", title: "The service floor", riddle: "The lift has a floor that isn't on the panel. It doesn't listen to clicks." },
  { id: "s11", title: "The last night", riddle: "Guests who checked in during the last hour of 30 September, between 23:00 and midnight, and never checked out. Their room numbers, lowest first, joined with dashes." },
  { id: "s12", title: "Staff only", riddle: "The staff door decides who you are from what you told it before. It remembers. Tell it something else." },
  { id: "s13", title: "The safe", riddle: "Behind the staff door, the safe works out its combination every time it opens, then hides it before it reaches the screen. Catch it in between." },
];

/* --------------------------------------------------------------------------
   Personal stamps. The hotel prints these with a 4-character tail that is
   different for every student: four characters of their own Firebase uid,
   so the database rules can check it (auth.uid.contains(tail)) and nobody
   can borrow someone else's. The order is the guest card's slot order, which
   the hotel's card.js relies on: change both together.
   -------------------------------------------------------------------------- */

export const PERSONAL = ["s03", "s04", "s06", "s07", "s09", "s10", "s12", "s13"];

export const CARD_KEY = "meridian.card";

export function pickTails(uid, count) {
  const source = uid.toUpperCase().replace(/[^A-Z0-9]/g, "");
  const tails = new Set();
  for (let tries = 0; tails.size < count && tries < 500; tries++) {
    const at = Math.floor(Math.random() * (source.length - 3));
    tails.add(source.slice(at, at + 4));
  }
  const list = [...tails];
  while (list.length < count) list.push(list[list.length % tails.size]);
  return list;
}

// The card is lightly scrambled so it doesn't read as a list of code endings.
export const encodeCard = (tails) =>
  btoa(JSON.stringify(tails).split("").map((c) => String.fromCharCode(c.charCodeAt(0) ^ 7)).join(""));
