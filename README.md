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
- `getTodayTasks` deed een `maybeSingle()`-query per geplande queeste in een
  `for`-lus, plus eventueel een insert: een N+1 die trager wordt naarmate het
  hof groeit. Nu is dat één `in()`-query plus één bulk-upsert. Rechtgezet bij
  het toevoegen van het Prijzenbord, dat er nog eens queestes bovenop legt.

---

## Spelmechanieken

Toegevoegd na de designreview. Wat hier staat werkt zonder migratie, tenzij
expliciet anders vermeld.

### De Vlam (reeks)

`src/services/streak.ts` + `src/components/Flame.tsx`

Voltooi minstens één queeste per dag en je vuur groeit. Sla een dag over en het
smeult (de **sintel-dag** — die dag kun je de reeks nog redden). Sla twee dagen
over en het gaat uit. De reeks geeft een XP-multiplier: ×1,0 bij 0–2 dagen,
×1,2 bij 3–6, ×1,5 vanaf 7, en daar houdt het op.

Waarom de cap: zonder cap loopt één iemand weg met de maand en wordt de ranking
zinloos voor de rest. De drie beloningsrangen zijn ook gebalanceerd rond
ongeveer niet-vermenigvuldigde totalen.

De reeks wordt berekend uit `task_instances.completed_at` — er is niets
opgeslagen dat kan verlopen of scheef kan gaan staan. De dag telt op basis van
de *lokale* dag van voltooiing, niet de `due_date`, zodat een queeste die om
00:30 afgewerkt wordt meetelt voor de dag waarop je hem echt deed.

### Drie sporen in plaats van één ladder

| Spoor | Wat | Reset |
| --- | --- | --- |
| Maandrang | De bestaande drie rangen en de echte beloningen | Elke maand — met opzet |
| Drakenrang | Ei → Jonge Draak → Vuurdraak → Hofdraak → Drakenheer | Nooit |
| Drakenzegels | Eén per maand die je op de hoogste rang afsluit | Nooit |

De maandrang is **niet aangeraakt**. Die drie rangen zijn een echte afspraak in
het gezin (badavond, spadag, weekendtrip) en dat is het waardevolste in de app.
Het nieuwe spoor loopt ernaast, niet erdoor.

Drakenrang is `sum(total_points)` over alle `monthly_summaries` van een lid;
zegels zijn `count(*) where reward_tier = 3`, met de huidige maand
uitgesloten — een zegel wordt geboekt als de maand *sluit*, anders zou hij
verschijnen en weer verdwijnen.

### Hofdoel en Het Beest

Eén gedeelde maandbalk met ieders XP samen. Het doel is `aantal hofleden × de
hoogste beloningsdrempel`, dus het schaalt automatisch mee als er iemand bij
komt of als een admin de rangen bijstelt. De individuele ranking blijft er
gewoon naast staan: samenwerken en competitie tegelijk.

Blijven er in een week te veel queestes liggen, dan ontwaakt **Het Beest** en
eet een stuk van het Hofdoel op (5 XP per gemiste queeste boven de tolerantie
van 2 per hoflid, tot maximaal een kwart van het doel).

> **Ontwerpregel, met opzet en belangrijk:** Het Beest rekent af met **het hof,
> nooit met een persoon**. Geen namen, geen per-persoon-teller op een gedeeld
> scherm. Een mechaniek die publiek de zwakste schakel in een gezin aanwijst,
> zorgt ervoor dat één kind door zijn broers en zussen wordt aangewezen als
> schuldige, en dat is erger dan een ongedweilde vloer. Breid dit niet uit met
> een uitsplitsing.

### Prijzenbord — vereist `005_bounties.sql`

`task_templates.user_id` mag `NULL` zijn, en `002_seed_data.sql` zet tien
templates zonder eigenaar in de database. Omdat `getTodayTasks` filtert op
eigendom, stonden die tien er wel maar zag niemand ze. Nu betekent "geen
eigenaar" *vrij op te nemen*: wie hem het eerst aanneemt, krijgt de XP.

Een bounty die na zijn geplande tijd blijft liggen, wordt langzaam
aantrekkelijker: +1 XP per uur, tot +5. De klus die niemand wil doen wordt zo
een uitdaging in plaats van een discussie.

Het opnemen is een *conditionele* update (`.is('claimed_by', null)`), niet
lezen-dan-schrijven: tikken twee kinderen tegelijk, dan raakt de tweede update
geen enkele rij en krijgt er precies één de queeste.

### Schatkamer — vereist `006_hoard.sql`

Munten (1 per 2 XP) lopen door over maanden heen en kopen uitsluitend uiterlijk:
vlamkleuren, drakensoorten, titels, kaartlijsten. Dit is het antwoord op het
feit dat maand-XP wordt gewist — een goede maand laat nu iets achter dat je
houdt.

**De browser schrijft zijn eigen saldo niet.** Alles wat de client mag updaten,
kan een kind met de console ook zelf zetten. Daarom:

- munten worden gemunt door een trigger op `task_instances`;
- uitgeven gebeurt via `buy_cosmetic()`, een `SECURITY DEFINER` functie die de
  prijs zelf uit `cosmetics_catalog` leest — de client noemt nooit een prijs;
- een guard-trigger weigert elke directe wijziging van `coins` of van het bezit.

Een al bezeten item *uitkiezen* mag de app wel gewoon zelf; daar valt niets te
winnen.

Dit staat los van het feit dat `points_earned` nog steeds door de client
geschreven wordt. Dat was al zo en verandert hier niet. Wil je dat ook
dichtzetten, dan moet `completeTaskInstance` een RPC worden.

### Bewust niet gebouwd

Geen loot boxes, geen willekeurige belongingen, geen tijdelijke "aanbiedingen".
Die werken, en dat is precies het probleem: dit is een app voor kinderen in een
gezin, en een variabel beloningsschema is niet iets om bij je eigen kinderen te
installeren. Alles hierboven is deterministisch — je ziet wat iets kost en wat
je krijgt.

---

## Optionele migraties en de capability-probe

`005` en `006` draai je zelf in de Supabase SQL editor. De app hoeft daar niet
op te wachten: `src/lib/capabilities.ts` test bij het opstarten of
`task_instances.claimed_by` en `profiles.coins` bestaan, en verbergt wat er nog
niet is. Draai je de migratie, dan verschijnt de feature bij de volgende reload
— zonder redeploy. Verwijder je de kolommen weer, dan verdwijnt hij netjes.

Beide migraties zijn geschreven om te werken **of `003_tighten_rls.sql` nu
actief is of teruggedraaid door `004`**. Ze gebruiken `add column if not exists`
en `drop policy if exists` + `create`, en omdat policies in Postgres permissief
zijn (met OR gecombineerd), versmalt een nieuwe policy niets als de ruime
policies uit `001` nog staan.

> Nog steeds onbekend: of `003` actief is. Check `pg_policies` voordat je verder
> bouwt op de RLS-aannames.

---

## Database

De web-app praat met dezelfde Supabase-instantie. De port zelf veranderde niets
aan het schema; de twee optionele migraties `005_bounties.sql` en
`006_hoard.sql` doen dat wel, en zijn allebei terug te draaien (het recept staat
onderaan in het bestand zelf).

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
index.css     9,1 kB gzip
react        12,4 kB gzip
motion       40,4 kB gzip
supabase     58,9 kB gzip
index       108,2 kB gzip
─────────────────────────
totaal      ±230 kB gzip
```

Ruim onder de 300 kB die de opdracht als grens stelde. De ember-velden achter
het ranking-podium zijn één `<canvas>` met ~34 deeltjes in plaats van 34
geanimeerde DOM-knopen; dat is bewust, want veertig absoluut gepositioneerde
`motion.span`-elementen krijgen elk hun eigen compositorlaag en slopen de
framerate op een telefoon.
