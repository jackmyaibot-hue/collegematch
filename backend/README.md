# CollegeMatch API (not used by the MVP)

This is the original player-signup service: email and phone account, SMS code, JWT, and a Postgres player profile. The Expo app does not call it. Profiles in the MVP stay on the phone.

The upload had these files flattened in the repo root, and `routes/auth.js` was missing even though `server.js` mounts it. They now live in this folder, with that router added.

Run it only when you are ready to replace on-device storage:

1. `createdb recruitment_app`
2. `cd backend && npm install`
3. `cp .env.example .env` and fill in Postgres, `JWT_SECRET`, and Twilio
4. `mkdir -p uploads/photos uploads/videos`
5. `npm start` — `GET /health` returns `{ "status": "ok" }`

Phone verification uses Twilio. Do not point the app at this API until there is a real privacy review, because most players are minors.

See the root README for the field mapping and the plan to connect it.
