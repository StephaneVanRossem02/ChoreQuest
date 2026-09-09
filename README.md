# Hof der Draken — ChoreQuest Web

De webversie van de ChoreQuest React Native app: dezelfde Supabase-backend, dezelfde
"Hof der Draken" wereld, maar dan als responsieve website die op GitHub Pages draait.

Voltooi hofqueestes, verdien Drakenvuur XP, stijg van Hofdame naar Drakenkoningin.

---

## Stack

| | |
|---|---|
| Build | Vite 6 + React 19 + TypeScript (strict) |
| Styling | Tailwind CSS v4 (`@theme`, geen config-bestand) |
| Routing | React Router v6 (HashRouter) |
| Animatie | Framer Motion |
| Componenten | class-variance-authority + Lucide icons |
| Backend | Supabase (auth, database, storage) — **ongewijzigd** |

---

## Lokaal draaien

```bash
npm install
```

```bash
npm run dev
```

Meer is er niet: de Supabase-waarden staan in `.env`, en dat bestand zit gewoon in de
repo. Wil je tijdelijk naar een andere Supabase-instantie wijzen, maak dan een
`.env.local` aan — die wint van `.env` en blijft buiten git.

De site draait op http://localhost:5173.

### Scripts

| Script | Doet |
|---|---|
| `npm run dev` | Dev-server met HMR |
| `npm run build` | Type-check + productiebuild naar `dist/` |
| `npm run preview` | Serveert de gebouwde `dist/` lokaal |
| `npm run type-check` | Alleen TypeScript |
| `npm run lint` | ESLint |

---

## Environment variables

| Variabele | Waar |
|---|---|
| `VITE_SUPABASE_URL` | `.env`, in de repo |
| `VITE_SUPABASE_ANON_KEY` | `.env`, in de repo |

**Waarom staat dat gewoon in git?** Omdat het geen geheimen zijn. Beide waarden worden
bij het bouwen in de JS-bundle gebakken; iedereen die de site opent kan ze uit de
broncode lezen. De key heet bij Supabase niet voor niets *publishable*. Wat je
beschermt zijn je row-level security policies, niet de onvindbaarheid van deze key.

Zet er dus **nooit** de `service_role` key naast — die omzeilt RLS volledig.

### Waarom geen GitHub Actions secrets

Dat leek netter, maar levert een valkuil op. Actions zet een niet-ingesteld secret op
een lege string, en een lege shell-variabele wint in Vite van `.env`. Je krijgt dan een
groene build die in de browser meteen "Supabase is niet geconfigureerd" gooit: een witte
pagina zonder dat er iets rood kleurt. Met de waarden in `.env` kan dat niet gebeuren.

Wil je later per omgeving wisselen, zet dan het `env:`-blok in
[`deploy.yml`](.github/workflows/deploy.yml) terug én zorg dat de secrets echt bestaan.

---

## Deployen naar GitHub Pages

1. Push deze map als repository naar GitHub.
2. **Settings → Pages → Source: GitHub Actions**.
3. Push naar `main` (of `master`). De workflow in
   [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) type-checkt, bouwt en
   publiceert.

Geen secrets in te stellen — zie hierboven.

De site staat daarna op `https://<gebruiker>.github.io/<repo>/`.

### Waarom je geen `base` hoeft in te stellen

GitHub Pages serveert vanaf `/<repo-naam>/`. De workflow zet `BASE_PATH` automatisch op
basis van de repositorynaam, en `vite.config.ts` leest die. Hernoem je de repo, dan blijft
het werken — je hoeft niets aan te passen.

### Waarom HashRouter

Pages is een statische host zonder rewrite-regels. Met een gewone BrowserRouter zou
`/-tasks/new` een 404 geven zodra iemand die URL ververst of deelt. Hash-routes
(`/#/tasks/new`) worden volledig client-side afgehandeld en overleven een refresh.

### Supabase redirect-URL

Zet in **Supabase → Authentication → URL Configuration** de site-URL op je Pages-adres,
anders komen bevestigings- en wachtwoordherstelmails op localhost uit.

---

## Wat er veranderde ten opzichte van de native app

De business-logica, database-queries en Supabase-integratie zijn 1-op-1 overgenomen.
Alleen wat platformgebonden was, is vervangen:

| React Native | Web |
|---|---|
| React Navigation (tabs + stacks) | React Router v6; sidebar op desktop, bottom nav op mobiel |
| `StyleSheet.create` | Tailwind v4 utilities |
| `Animated` | Framer Motion |
| `expo-linear-gradient` | CSS gradients |
| `expo-camera` / `expo-image-picker` | `<input type="file" capture="environment">` — opent de camera op telefoons, gewone bestandskiezer op desktop |
| `AsyncStorage` | `localStorage` |
| `Alert.alert` | Toasts + een echte confirm-dialog (`UIContext`) |
| `PanResponder` tab-swipe | Touch-events (`useSwipeNav`) |
| `expo-notifications` | Web Notifications API — zie hieronder |
| `@expo/vector-icons` | Lucide |

### Herinneringen werken anders

Dit is de enige feature die de web-versie niet volledig kan evenaren. De native app
plande notificaties bij het besturingssysteem, dat ze ook afvuurde als de app dicht was.
Een browser kan dat niet zonder push-server.

Wat er wél gebeurt: zolang het Hof open staat in een tab, worden de herinneringen van
vandaag gepland (inclusief de "de draak is teleurgesteld"-opvolgers elk uur). Staat de
tab dicht, dan komt er niets binnen. Toestemming vraag je aan het einde van de
onboarding of via **Profiel → Herinneringen**.

Wil je echte push-notificaties, dan is daar een service worker plus een push-backend
voor nodig — dat past niet binnen een statische Pages-deploy.

### Foto-upload

Onveranderd qua opslag (bucket `task-photos`), maar de web-versie schaalt de foto eerst
terug naar max 1280px en herencodeert naar JPEG op kwaliteit 0.7. Telefooncamera's
leveren foto's van meerdere megabytes, terwijl een bewijsfoto nooit groter dan een paar
honderd pixels getoond wordt.

### Niet meegenomen

Drie dingen uit de native codebase zijn bewust weggelaten omdat ze daar al dood waren:

- `TaskScheduleFormScreen` — geregistreerd als route, maar nergens naartoe genavigeerd.
  De planning zit al in het queeste-formulier zelf.
- `useMonthSummary` — nergens geïmporteerd, en riep `getMonthlySummary()` aan met één
  argument terwijl de service er twee verwacht.
- `PhotoViewer` — vervangen door `TaskReport`, dat de app daadwerkelijk gebruikt.

### Bugs die tijdens de port zijn rechtgezet

- `useTodayTasks` en `CalendarScreen.load` hadden een lege dependency-array terwijl ze
  `user` uit de closure lazen. Na een herlogin bleven ze de eerste render's gebruiker
  gebruiken en laadden ze niets meer.
- `updateReward` deed een dynamische her-import van de Supabase-client die de
  module-scope client afdekte, zonder reden.

---

## Database

De web-app praat met dezelfde Supabase-instantie en verandert **niets** aan het schema.

Let op: de SQL in `supabase/migrations/` van de native repo loopt achter op de
werkelijke database — kolommen als `task_templates.user_id`, `task_templates.is_deleted`,
`monthly_summaries.user_id` en de hele `profiles`-tabel zijn later rechtstreeks
toegevoegd. `src/types/database.ts` beschrijft de echte, huidige structuur.

---

## Toegankelijkheid

- Volledig toetsenbord-navigeerbaar, met een zichtbare focus-ring en een
  "Naar inhoud"-skiplink.
- Iconen zijn `aria-hidden`; knoppen die alleen een icoon tonen hebben een `aria-label`.
- Modals zijn echte dialogs (`role="dialog"`, `aria-modal`), sluiten op Escape en
  vangen focus op.
- Kleuren halen WCAG AA in beide thema's; de licht-variant gebruikt daarom donkerdere
  goud- en brons-tinten dan de donkere.
- `prefers-reduced-motion` schakelt alle animaties uit.

## Thema

Donker is de standaard — dat *is* de identiteit van het Hof. Een lichte parchment-variant
zit erbij en is te wisselen via **Profiel → Nachtelijk/Daglicht Hof**; de keuze wordt in
`localStorage` bewaard en vóór de eerste paint toegepast, dus zonder flits.

---

## Bundlegrootte

```
index.css     8,5 kB gzip
react        12,4 kB gzip
motion       40,4 kB gzip
supabase     58,9 kB gzip
index        97,0 kB gzip
─────────────────────────
totaal      ±217 kB gzip
```
