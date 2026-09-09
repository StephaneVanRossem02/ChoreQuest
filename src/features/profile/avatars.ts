export type AvatarOption = { id: string; label: string; code: string; bg: string };

/** The 32 "klassen" a court member can pick, rendered as Twemoji images. */
export const AVATARS: AvatarOption[] = [
  { id: 'dragon', label: 'Draak', code: '1f409', bg: '#7c1d1d' },
  { id: 'crown', label: 'Koningskroon', code: '1f451', bg: '#78350f' },
  { id: 'mage', label: 'Magiër', code: '1f9d9', bg: '#2e1065' },
  { id: 'castle', label: 'Burcht', code: '1f3f0', bg: '#292524' },
  { id: 'crystal', label: 'Ziener', code: '1f52e', bg: '#1e1b4b' },
  { id: 'swords', label: 'Ridder', code: '2694', bg: '#1e3a5f' },
  { id: 'shield', label: 'Schildwacht', code: '1f6e1', bg: '#14532d' },
  { id: 'bow', label: 'Boogschutter', code: '1f3f9', bg: '#166534' },
  { id: 'gem', label: 'Edelsteen', code: '1f48e', bg: '#312e81' },
  { id: 'eagle', label: 'Adelaar', code: '1f985', bg: '#431407' },
  { id: 'wolf', label: 'Wolf', code: '1f43a', bg: '#1c1917' },
  { id: 'lion', label: 'Leeuw', code: '1f981', bg: '#713f12' },
  { id: 'unicorn', label: 'Eenhoorn', code: '1f984', bg: '#4a044e' },
  { id: 'fire', label: 'Vuurmeester', code: '1f525', bg: '#7c2d12' },
  { id: 'lightning', label: 'Bliksem', code: '26a1', bg: '#1c1917' },
  { id: 'moon', label: 'Maanbewaarder', code: '1f319', bg: '#0c1a2e' },
  { id: 'elf', label: 'Elf', code: '1f9dd', bg: '#14532d' },
  { id: 'vampire', label: 'Vampier', code: '1f9db', bg: '#3b0764' },
  { id: 'fairy', label: 'Fee', code: '1f9da', bg: '#500724' },
  { id: 'genie', label: 'Geest', code: '1f9de', bg: '#1e3a5f' },
  { id: 'dagger', label: 'Sluipmoordenaar', code: '1f5e1', bg: '#1c1917' },
  { id: 'snake', label: 'Slang', code: '1f40d', bg: '#14532d' },
  { id: 'axe', label: 'Strijder', code: '1fa93', bg: '#431407' },
  { id: 'star', label: 'Sterrenwacht', code: '2b50', bg: '#1e1b4b' },
  { id: 'wand', label: 'Tovenaar', code: '1fa84', bg: '#2e1065' },
  { id: 'skull', label: 'Doodshoofd', code: '1f480', bg: '#1c1917' },
  { id: 'key', label: 'Sleutelhouder', code: '1f511', bg: '#78350f' },
  { id: 'potion', label: 'Alchemist', code: '1f9ea', bg: '#14532d' },
  { id: 'book', label: 'Geleerde', code: '1f4d6', bg: '#1e3a5f' },
  { id: 'compass', label: 'Ontdekkingsreiziger', code: '1f9ed', bg: '#164e63' },
  { id: 'bear', label: 'Beer', code: '1f43b', bg: '#292524' },
  { id: 'ghost', label: 'Spook', code: '1f47b', bg: '#0f172a' },
];

export function getTwemojiUrl(code: string): string {
  return `https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/${code}.png`;
}

export function getAvatarByUrl(url: string | null): AvatarOption | null {
  if (!url) return null;
  return AVATARS.find((a) => getTwemojiUrl(a.code) === url) ?? null;
}
