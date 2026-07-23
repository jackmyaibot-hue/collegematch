# Recruitment App — Player Onboarding MVP (Backend)

This is the starting backend for the player side of the recruitment app: sign up,
phone verification (2FA), survey/profile data, and photo/video uploads.

## What's here

```
recruitment-app/
├── server.js                  # App entry point
├── package.json
├── .env.example                # Copy to .env and fill in real values
├── config/
│   └── database.js             # PostgreSQL connection (via Sequelize)
├── models/
│   └── Player.js                # Player profile schema (all survey fields)
├── controllers/
│   ├── authController.js       # Signup, 2FA verification, login
│   └── playerController.js     # Get/update profile, photo & video upload
├── routes/
│   ├── auth.js
│   └── players.js
├── middleware/
│   └── auth.js                  # JWT check for protected routes
└── utils/
    ├── twilio.js                 # Sends the 2FA SMS code
    └── fileUpload.js             # Multer config for photo/video uploads
```

## Setup

1. **Install Node.js** if you don't have it: https://nodejs.org (LTS version)

2. **Install PostgreSQL** and create a database:
   ```
   createdb recruitment_app
   ```

3. **Install dependencies** — open a terminal in this folder and run:
   ```
   npm install
   ```

4. **Set up environment variables**:
   ```
   cp .env.example .env
   ```
   Then open `.env` and fill in your real database password, a random JWT secret,
   and your Twilio credentials (sign up free at twilio.com to get these — needed
   for the 2FA text messages).

5. **Create upload folders** (multer expects these to exist):
   ```
   mkdir -p uploads/photos uploads/videos
   ```

6. **Run it**:
   ```
   npm start
   ```
   You should see `Server running on port 3000`.

7. **Test it's alive** — visit `http://localhost:3000/health` in a browser,
   should return `{"status":"ok"}`.

## API endpoints so far

| Method | Endpoint | Description |
|---|---|---|
| POST | /api/auth/signup | Create account, sends 2FA code via text |
| POST | /api/auth/verify-2fa | Verify the code, returns a login token |
| POST | /api/auth/login | Log in with email/password |
| GET | /api/players/:playerId | Get a player's profile |
| PUT | /api/players/:playerId | Update profile / survey answers |
| POST | /api/players/:playerId/photo | Upload headshot |
| POST | /api/players/:playerId/video | Upload highlight video |

All `/api/players/*` routes require a `Authorization: Bearer <token>` header
using the token you get back from `verify-2fa` or `login`.

## Not built yet (next steps)

- Frontend (the actual screens players tap through)
- Survey questions endpoint (right now survey fields just live on the Player
  model — you'd build a UI that fills them in via the PUT endpoint)
- Coach accounts / matching engine
- Messaging between coaches and players
- Tournament/showcase notifications
- Gamification (points, streaks, sharing)

## A note on running this

This is a Node.js backend — there's no visual "app" to open yet, it's the
engine that a frontend (web or mobile) would talk to. To actually see and
click through screens, you'd next build a frontend (e.g. a React Native or
Flutter app for mobile, or a React web app) that calls these endpoints.
