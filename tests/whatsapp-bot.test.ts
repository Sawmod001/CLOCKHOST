import test from "node:test";
import assert from "node:assert/strict";

import {
  parseIntent,
  extractArea,
  formatPrice,
  buildSearchResults,
  buildAvailability,
  handleMessage,
  normalizePhone,
  shouldUseGemini,
} from "../src/lib/whatsapp/bot.ts";

function makeListing(overrides: Record<string, any> = {}): any {
  return {
    id: "11111111-1111-1111-1111-111111111111",
    title: "Orca Lounge",
    vertical: "venue",
    booking_type: "capacity",
    status: "active",
    location: { state: "Lagos", cityArea: "Ikeja" },
    pricing: { baseRatePerHour: 4500000 },
    operational_rules: { maxCapacity: 60, setupTimeMinutes: 30, cleanupTimeMinutes: 30 },
    ...overrides,
  };
}

function makeSlot(overrides: Record<string, any> = {}): any {
  const base = Date.now() + 60 * 60 * 1000;
  return {
    id: "22222222-2222-2222-2222-222222222222",
    listing_id: "11111111-1111-1111-1111-111111111111",
    event_start: new Date(base + 60 * 1000).toISOString(),
    event_end: new Date(base + 3 * 60 * 60 * 1000).toISOString(),
    capacity: 60,
    booked: 9,
    ...overrides,
  };
}

function fakeDeps(listings: any, slotsByListing: Record<string, any> = {}): any {
  return {
    listActiveListings: async () => listings,
    listSlots: async (listingId: string) => slotsByListing[listingId] || [],
  };
}

test("normalizePhone strips formatting", () => {
  assert.equal(normalizePhone("+234 812 345 6789"), "2348123456789");
});

test("parseIntent: menu keywords reset the session", () => {
  for (const keyword of ["menu", "help", "hi", "reset"]) {
    assert.deepEqual(parseIntent(keyword, { step: "selection", listings: [makeListing()] }), {
      intent: "reset",
    });
  }
});

test("parseIntent: number during selection maps to a listing index", () => {
  const state = { step: "selection", listings: [makeListing(), makeListing({ title: "Havenda Hall" })] };
  assert.deepEqual(parseIntent("2", state), { intent: "select", index: 2 });
  assert.deepEqual(parseIntent("select 1", state), { intent: "select", index: 1 });
});

test("parseIntent: search keywords produce a search intent", () => {
  assert.deepEqual(parseIntent("find a venue in Ikeja", null), { intent: "search" });
  assert.deepEqual(parseIntent("search spaces in Lagos", null), { intent: "search" });
});

test("parseIntent: unrelated text falls back to menu", () => {
  assert.deepEqual(parseIntent("what time is it", null), { intent: "menu" });
});

test("parseIntent: about phrases produce an about intent", () => {
  for (const phrase of ["what is clockhost", "about clockhost", "who are you", "what do you do"]) {
    assert.deepEqual(parseIntent(phrase, null), { intent: "about" }, phrase);
  }
});

test("parseIntent: group booking phrases produce a group_booking intent", () => {
  for (const phrase of ["group booking", "split the cost", "book as a group", "how does group booking work"]) {
    assert.deepEqual(parseIntent(phrase, null), { intent: "group_booking" }, phrase);
  }
});

test("extractArea pulls the capitalised place name", () => {
  assert.equal(extractArea("find a venue in Ikeja"), "Ikeja");
  assert.equal(extractArea("show venues in Lekki Phase 1"), "Lekki Phase 1");
  assert.equal(extractArea("show venues"), null);
});

test("extractArea matches known areas case-insensitively", () => {
  assert.equal(extractArea("find a venue in ikeja"), "Ikeja");
  assert.equal(extractArea("spaces in lekki"), "Lekki");
  assert.equal(extractArea("any venue at yaba?"), "Yaba");
});

test("formatPrice converts kobo to naira", () => {
  assert.equal(formatPrice(4500000), "₦45,000");
});

test("buildSearchResults lists matched venues with price and free slots", () => {
  const listing = makeListing();
  const slots = [makeSlot()];
  const out = buildSearchResults([{ listing, slots }]);
  assert.match(out, /Orca Lounge/);
  assert.match(out, /Ikeja/);
  assert.match(out, /₦45,000\/hr/);
  assert.match(out, /1 free slot/);
});

test("buildAvailability shows a free-slot breakdown and resets hint", () => {
  const listing = makeListing();
  const slots = [makeSlot({ booked: 9 }), makeSlot({ booked: 60 })];
  const out = buildAvailability(listing, slots);
  assert.match(out, /Base rate: ₦45,000\/hr/);
  assert.match(out, /51 of 60 free/);
  assert.match(out, /Reply "menu" to search again/);
});

test("buildAvailability reports when there are no open slots", () => {
  const listing = makeListing();
  const slots = [makeSlot({ booked: 60 })];
  const out = buildAvailability(listing, slots);
  assert.match(out, /No free slots coming up/);
});

test("handleMessage: full search -> select flow is read-only and self-contained", async () => {
  const listing = makeListing();
  const sessions = new Map();
  const deps = fakeDeps([listing], { [listing.id]: [makeSlot()] });

  const searchReplies = await handleMessage({
    phone: "+2348123456789",
    text: "find a venue in Ikeja",
    sessions,
    deps,
  });
  assert.equal(searchReplies[0].kind, "list");
  assert.match(searchReplies[0].body, /found 1 active venue/);
  assert.match(searchReplies[0].sections[0].rows[0].title, /Orca Lounge/);

  const detailReplies = await handleMessage({
    phone: "+2348123456789",
    text: "1",
    sessions,
    deps,
  });
  assert.equal(detailReplies[0].kind, "text");
  assert.match(detailReplies[0].text, /Base rate: ₦45,000\/hr/);
  assert.equal(detailReplies[1].kind, "buttons");
});

test("handleMessage: out-of-range selection asks for a valid number", async () => {
  const listing = makeListing();
  const sessions = new Map();
  const deps = fakeDeps([listing], { [listing.id]: [] });

  await handleMessage({ phone: "+2348123456789", text: "find a venue", sessions, deps });
  const replies = await handleMessage({ phone: "+2348123456789", text: "9", sessions, deps });
  assert.equal(replies.length, 1);
  assert.match(replies[0].text, /That one isn't in the list/);
});

test("handleMessage: menu resets an in-progress selection", async () => {
  const listing = makeListing();
  const sessions = new Map();
  const deps = fakeDeps([listing], { [listing.id]: [] });

  await handleMessage({ phone: "+2348123456789", text: "find a venue", sessions, deps });
  assert.equal(sessions.size, 1);

  const replies = await handleMessage({ phone: "+2348123456789", text: "menu", sessions, deps });
  assert.equal(sessions.size, 0);
  assert.equal(replies[0].kind, "buttons");
  assert.match(replies[0].body, /ClockHost WhatsApp desk is on/);
});

test("handleMessage: no venues produces a friendly empty state", async () => {
  const sessions = new Map();
  const deps = fakeDeps([]);
  const replies = await handleMessage({ phone: "+2348123456789", text: "find a venue in Ikeja", sessions, deps });
  assert.match(replies[0].text, /No active venues found in Ikeja/);
});

test("shouldUseGemini: never for reset/select/plain area searches/about/group booking", () => {
  assert.equal(shouldUseGemini("menu", { intent: "reset" }), false);
  assert.equal(shouldUseGemini("2", { intent: "select" }), false);
  assert.equal(shouldUseGemini("find a venue in Ikeja", { intent: "search" }), false);
  assert.equal(shouldUseGemini("thanks", { intent: "menu" }), false);
  assert.equal(shouldUseGemini("what is clockhost", { intent: "about" }), false);
  assert.equal(shouldUseGemini("group booking", { intent: "group_booking" }), false);
});

test("shouldUseGemini: true for ambiguous searches and free-form questions", () => {
  assert.equal(shouldUseGemini("show me venues", { intent: "search" }), true);
  assert.equal(shouldUseGemini("what do you have", { intent: "menu" }), true);
  assert.equal(shouldUseGemini("how much for a wedding this saturday", { intent: "menu" }), true);
  assert.equal(shouldUseGemini("find a venue in ikeja cheapest", { intent: "search" }), true);
  assert.equal(shouldUseGemini("best place for a party in lekki", { intent: "search" }), true);
});

test("handleMessage: free-form question uses generateReply and keeps session", async () => {
  const listing = makeListing();
  const sessions = new Map();
  const deps: any = {
    ...fakeDeps([listing], { [listing.id]: [makeSlot()] }),
    generateReply: async ({ text, venues }: any) => `AI answer to "${text}" for ${venues[0].listing.title}`,
  };

  const replies = await handleMessage({ phone: "+2348123456789", text: "how much for a wedding", sessions, deps });
  assert.equal(replies.length, 1);
  assert.match(replies[0].text, /AI answer to "how much for a wedding" for Orca Lounge/);
  assert.equal(sessions.size, 1);
});

test("handleMessage: about intent returns the ClockHost explainer", async () => {
  const replies = await handleMessage({
    phone: "+2348123456789",
    text: "what is clockhost",
    sessions: new Map(),
    deps: fakeDeps([]),
  });
  assert.equal(replies.length, 1);
  assert.match(replies[0].text, /Nigerian marketplace/);
});

test("handleMessage: group booking without a selected venue asks to pick one first", async () => {
  const replies = await handleMessage({
    phone: "+2348123456789",
    text: "group booking",
    sessions: new Map(),
    deps: fakeDeps([]),
  });
  assert.match(replies[0].text, /Pick a venue first/);
  assert.equal(replies[1].kind, "buttons");
});

test("handleMessage: group booking after selecting a venue returns a prefilled plan link", async () => {
  const listing = makeListing();
  const sessions = new Map();
  const deps: any = {
    ...fakeDeps([listing], { [listing.id]: [makeSlot()] }),
    baseUrl: "https://clockhost.example",
  };

  await handleMessage({ phone: "+2348123456789", text: "find a venue in Ikeja", sessions, deps });
  await handleMessage({ phone: "+2348123456789", text: "1", sessions, deps });
  assert.equal((sessions.get("2348123456789") as any).selectedListing.id, listing.id);

  const replies = await handleMessage({ phone: "+2348123456789", text: "group booking", sessions, deps });
  assert.equal(replies.length, 1);
  assert.match(replies[0].text, /Group booking for Orca Lounge/);
  assert.match(replies[0].text, /https:\/\/clockhost\.example\/group-plans\/new\?listingId=/);
});

test("handleMessage: falls back to interactive list when generateReply throws", async () => {
  const listing = makeListing();
  const sessions = new Map();
  const deps: any = {
    ...fakeDeps([listing], { [listing.id]: [makeSlot()] }),
    generateReply: async () => {
      throw new Error("rate limited");
    },
  };

  const replies = await handleMessage({ phone: "+2348123456789", text: "show me venues", sessions, deps });
  assert.equal(replies.length, 1);
  assert.equal(replies[0].kind, "list");
  assert.match(replies[0].sections[0].rows[0].title, /Orca Lounge/);
});

test("handleMessage: free-form question without AI returns the menu", async () => {
  const sessions = new Map();
  const replies = await handleMessage({ phone: "+2348123456789", text: "how much for a wedding", sessions, deps: fakeDeps([]) });
  assert.equal(replies.length, 1);
  assert.equal(replies[0].kind, "buttons");
  assert.match(replies[0].body, /ClockHost WhatsApp desk is on/);
});
