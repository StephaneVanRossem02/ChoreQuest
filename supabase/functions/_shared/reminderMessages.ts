/**
 * Reminder texts, shared by the browser (in-app fallback timers) and the
 * `send-reminders` Edge Function, so both speak with the same dragon.
 *
 * Plain TypeScript with no imports: it has to load in Vite and in Deno.
 */

export const MESSAGES = [
  (name: string) => `🐉 De draak wacht niet — tijd voor: ${name}!`,
  (name: string) => `✨ Het hof eist je aanwezigheid! Queeste: ${name}`,
  (name: string) => `🌙 De nacht fluistert... vergeet ${name} niet, ridder!`,
  (name: string) => `⭐ Jouw XP wacht op je! Voltooi: ${name}`,
  (name: string) => `🌹 Een heldin verwaarloost haar queeste niet: ${name}`,
  (name: string) => `🔮 De magie vervliegt als je ${name} vergeet!`,
  (name: string) => `👑 Je troon vergt inspanning: ${name}`,
  (name: string) => `🌿 Het woud fluistert: ${name} moet gedaan worden`,
  (name: string) => `🐉 Vlieg hoog, drakenridder! ${name} staat op je lijst`,
  (name: string) => `💜 Rhysand zou dit niet vergeten — ${name} wacht op jou!`,
  (name: string) => `🌟 Sterren verlichten je pad: ${name} is jouw queeste!`,
  (name: string) => `⚔️ Maak je zwaard gereed voor: ${name}!`,
];

export const SAD_MESSAGES = [
  (name: string) => `😔 ${name} wacht nog steeds... De draak is teleurgesteld.`,
  (name: string) => `💔 Rhysand kijkt toe met droeve ogen — ${name} is nog niet voltooid.`,
  (name: string) => `🌧️ Het Hof zucht. ${name} blijft ongedaan, ridder.`,
  (name: string) => `🕯️ De kaarsen in het Hof doven... ${name} wacht op jou.`,
  (name: string) => `🌙 De uren verstrijken en ${name} is nog steeds niet klaar. Kom.`,
  (name: string) => `😢 Zelfs de draak verliest zijn geduld... ${name} moet nu!`,
];

export const BOUNTY_MESSAGES = [
  (name: string) => `🪙 Een vrije queeste op het Prijzenbord: ${name}. Wie neemt hem?`,
  (name: string) => `📜 Het Prijzenbord roept! ${name} is nog van niemand.`,
];

export const TITLES = [
  '🐉 Queeste van het Hof',
  '✨ Magische Herinnering',
  '🌙 Nacht Hof Roept',
  '👑 Jouw Missie Wacht',
  '🌹 Hof der Dromen',
  '🔮 Magische Queeste',
];

export const SAD_TITLES = [
  '💔 Queeste verwaarloosd',
  '😔 Het Hof wacht nog steeds',
  '🌧️ Ridder, waar ben je?',
  '🕯️ De tijd verstrijkt...',
];

/** How many hourly "the dragon is disappointed" nudges follow the first one. */
export const SAD_NUDGES = 4;

/** Nudges stop at this hour; nobody needs a sad dragon at midnight. */
export const LAST_NUDGE_HOUR = 23;

export function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
