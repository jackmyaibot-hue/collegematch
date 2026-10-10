# CollegeMatch

CollegeMatch is a free iOS and Android app for high school athletes. It works like a card deck for college programs: swipe right to save a school, left to pass, then write a short intro to a coach.

Girls' soccer is the first deck, with a fictional women's college catalog. Other sports, and men's programs, are in the profile so they can be added later. Until a sport has programs, the app shows a coming-soon message instead of an empty deck.

The app does not charge athletes. Sponsor slots are placeholders in the deck, clearly labeled **Sponsored**. Profile data stays on the phone. The app does not track athletes.

## Sample data

**The schools in the app are fictional.** Names, conferences, coaches, roster counts, costs, acceptance rates, camp dates, mascots, records, and Instagram handles are made up so the MVP can run without a live data license. Coach emails use `example.com` and will not reach anyone. Instagram handles start with `cm` (for example `cmnorthwind`) and are not real accounts. The banner in the app says the same thing. The catalog is `mobile/src/data/samplePrograms.ts` (40 programs across NCAA D1, D2, D3, NAIA, and NJCAA) plus two sponsor placeholders in `mobile/src/data/sponsored.ts`.

## Run it on a phone

You need Node.js 22.13 or newer and the free **Expo Go** app from the App Store or Google Play.

```bash
cd mobile
npm install
npx expo start
```

1. Phone and computer on the same Wi-Fi.
2. Scan the QR code: the iPhone camera will offer to open Expo Go; on Android, scan from inside Expo Go.
3. The first screen is profile setup. After that, the deck, saved list, school page, and coach email all use the sample catalog.

If the phone cannot see the dev server, stop it and run `npx expo start --tunnel`. The CLI may ask you to sign in to a free Expo account for the tunnel.

A desktop preview (same screens, mouse-drag to swipe) is `npm run web` from `mobile/`, or `npm run web` from the repo root.

`npm run check` verifies the sample catalog, fit score, and email builder. `npm run typecheck` runs TypeScript.

## What the MVP does

1. **Profile.** Name, birthday, girls or boys programs (or prefer not to say), sport, grad year, positions (multi-select, with one primary and the rest secondary), club, and every league they play in. Soccer leagues are ECNL, ECNL-RL, Girls Academy, NAL, USYS, NWSL Academy, USL Academy, and Other / High school. Then a highlight link, dominant foot, years at the current league level, jersey number, club coach contact, optional high school coach contact, GPA, optional SAT/ACT, one or more intended majors (plus a custom major), honors and leadership, a short "something I'm proud of" and a fun fact, home state, the levels they want (or open to all), regions, campus size, optional campus-life vibes, net-cost budget, and a required parent email that is copied on coach emails and stays on the phone.
2. **Deck.** Programs ranked by a fit score. Each card is a short recruiting poster: a large school crest on the school colors, division, location, enrollment, acceptance, and net cost. A Photos button (camera icon and count) opens a gallery of campus, field, team, and city pictures. Swiping inside that gallery does not pass or save the card. A spot meter shows how many players at her positions are graduating. A team snapshot has last season’s record, conference finish, postseason, and the head coach. “Could you play here?” counts players from her state and league, with the fit score and an expandable “why this fits.” Two small links open the athletics page and the team’s Instagram in the browser or the Instagram app. There is no video on the card. Pass and Save stay under the card. Visit opens the school page.
3. **Saved schools.** Detail page with coaches (name, title, email), questionnaire link, ID camp dates, admissions and cost info, and an athletics link.
4. **Coach email.** A short editable intro (positions, jersey number, dominant foot, years at league level, coach references, highlight, grad year, majors, a brief honors line, and a light personal note) opens in the device mail app with `mailto`. Status per school: not contacted, emailed, replied, follow-up due, plus a reminder date.
5. **Sponsored slots.** A “Sponsored ID camp” card can appear in the deck. It is labeled Sponsored and is not scored as a college match.

Swipe right saves, left passes. Undo puts the last swipe back. Passed schools can be returned to the deck from the empty state or the profile tab.

## Data model

TypeScript types live in `mobile/src/data/types.ts`. The important records:

| Type | Role |
|---|---|
| `PlayerProfile` | The athlete. Sport, gender, birthday, positions, primary position, and leagues. Stored only on device. |
| `Program` | One college program: `sport`, `side` (`women` or `men`), campus, cost, academics, roster by position, coaches, camps, links, plus a fictional poster (mascot, colors, record, roster origins, Instagram handle). The sample rows are women's soccer. |
| `Coach` | Name, title, email. |
| `SponsoredPlacement` | A labeled sponsor card and where it sits in the deck. |
| `SavedProgram` | Save time, outreach status, follow-up date, and the last email draft. |
| `RecruitingState` | Saved programs, passes, and sponsor saves or dismissals. |

Soccer positions are `GK`, `CB`, `FB`, `DM`, `CM`, `W`, and `ST`. Other sports keep an empty position and league list in `mobile/src/data/sports.ts` until they have a catalog. Divisions are `NCAA D1`, `NCAA D2`, `NCAA D3`, `NAIA`, and `NJCAA`.

Girls maps to women's programs and boys maps to men's. Prefer not to say does not filter by side. A sport and side with no programs shows a coming-soon screen.

Welcome backgrounds are original illustrations generated for this app and bundled in `mobile/assets/welcome`. They are not stock photos. Before a sport is chosen, the welcome screen rotates through a few sports under the lights. After that, it uses the picture for the sport they picked. Onboarding calls the athletes playmakers.

Discover-card photos live in `mobile/assets/cards`. Campus, field, team, and city pictures are Unsplash stock under the [Unsplash License](https://unsplash.com/license), cropped and compressed so the schools can share one small pool. Coach portraits in that folder are original illustrations made for this app, not photographs of real coaches.

Screens do not import the sample JSON directly. They use `mobile/src/data/index.ts`:

- `programCatalog` — `listPrograms()` / `getProgram()`
- `sponsorInventory` — `listPlacements()`
- `playerStore` and `recruitingStore` — AsyncStorage

Swap those four exports when a real source exists. The UI can stay the same.

### Plugging in real data later

`Program` is the merged view. A composite catalog can fill it from three places:

- **Magisterial** — division, conference, roster, sport identity. Store their id on `Program.externalIds.magisterial`.
- **College Scorecard** — enrollment, admission rate, net price, typical academics. Store their id on `Program.externalIds.scorecard`.
- **A licensed coach-contact list** — coach name, title, and email. Do not scrape inboxes or staff directories.

Keep `sample: true` off for live rows, and drop the in-app sample banner when `programCatalog.sourceId` is no longer `'sample'`.

The fit score stays a pure function in `mobile/src/data/fitScore.ts`, so it can run on the phone or move to an API later.

### Fit score

The score is 0–100, a weighted average of six 0–100 pieces. The card sentence is the strongest piece. It is a sorting aid, not a scholarship offer or an admissions decision.

| Piece | Weight | Rule, in short |
|---|---|---|
| Academics | 22% | GPA, and SAT/ACT when the player entered them, versus the school’s typical admits. |
| Level | 20% | The strongest selected league sets the level: ECNL highest, then NWSL Academy, ECNL-RL, USL Academy, Girls Academy, NAL, USYS, then other or high school. Closest match to the division scores highest. Divisions they did not pick are left out of the deck. A level they did pick is not scored as a poor fit. Campus life is not its own percentage: a matching vibe can add a few points and a short line on the card. |
| Region | 18% | 100 if the campus is in a picked region or the home state, partial credit for a neighboring region. |
| Roster need | 16% | Share of players at the position who are graduating. Every selected position is scored, and the strongest one is used. The primary position wins a tie. |
| Cost | 14% | Estimated net cost versus the budget range. “Not sure yet” stays near the middle. |
| Size | 10% | Under 3,000, 3,000–10,000, or 10,000+, or no preference. |

## Privacy

Most athletes are minors. The MVP does not create accounts and does not send the profile to a server. It does not track anyone. The optional parent email is stored on the device and added as a Cc when a coach draft opens. Reset from the profile tab erases the local profile and the deck.

## Repo layout

```
mobile/     Expo app (this is what you run)
backend/    Earlier Node API for accounts and profiles. Not required for the MVP.
```

The backend was checked in as loose files at the repo root (`server.js` required `./routes/auth`, which was not in the upload). Those files are under `backend/` now, and the auth router is filled in so the server matches its own routes. See `backend/README.md`.

Mobile profile fields line up with columns on `backend/models/Player.js` for a later sync: `positions`, `league`, `stats`, `sat`, `act`, `home_state`, `school_size_preference`, `intended_major`, `budget_min`, `budget_max`, `parent_email`, plus the original `club_name`, `gpa`, `graduation_year`, and `highlight_video_url`. The phone now also stores `sport`, `gender`, `birthdate`, `primaryPosition`, a list of `leagues`, dominant foot, years at league level, jersey number, club and high school coach contacts inside `stats`, `intendedMajors`, honors, `proudOf`, and `funFact`. The phone still stores a single display name; the API has separate first and last name fields.

## Next steps

1. **Real data.** Implement a `ProgramCatalog` that joins Magisterial, College Scorecard, and a licensed coach list. Replace the sample binding in `mobile/src/data/index.ts`.
2. **Backend and auth.** Decide what a minor’s account is allowed to store. The existing API has email, phone, and Twilio SMS verification; that needs a privacy review before the app calls it. Then point `playerStore` and `recruitingStore` at that API instead of AsyncStorage.
3. **App Store and Play Store.** The Expo project is set up for Expo Go, not a store binary. Use EAS Build (`npx eas-cli build`) with the bundle id `com.collegematch.app`, add a privacy policy and a kids/teen data disclosure, and submit with `eas submit`. Apple and Google both require accounts, screenshots, and a review of apps used by minors.
4. **Coach-side app.** A later app can let staff see only the players who contacted them, answer questionnaires, and post camp dates. It should be a separate client on the same program and message models, not a mode inside the player app.
