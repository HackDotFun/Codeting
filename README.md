# OneGunProject

![logo_one_gun](https://github.com/user-attachments/assets/16e97904-4ef3-4936-b0d6-0e2d4e711fb6)

An on-chain, Telegram-powered Russian Roulette game built on Solana. Players holding the \$GUN token can generate a game wallet, form 4-player lobbies, and battle it out for wins recorded on Supabase. A static Bootstrap front-end displays live leaderboards and battle logs.

---

## 📦 Tech Stack

* **Node.js & Telegraf** — Bot framework for Telegram integration
* **@solana/web3.js** — In-chat wallet management on Solana
* **Supabase** — PostgreSQL database + REST API for sessions, users, games, leaderboards
* **Bootstrap 5** — Responsive front-end layout
* **Intersection Observer** — Smooth section reveal animations
* **Font Awesome & Google Fonts** — Icons & typography

---

## 🚀 Features

* **Wallet Generation**: `/generate` creates a Solana keypair after verifying \$GUN holdings
* **4-Player Lobbies**: Invite friends, auto‑count players, start game with a 3 s countdown
* **Russian Roulette Logic**: Simulated spin with random elimination
* **Persistent Stats**: Sessions, games, wins stored in Supabase; leaderboard and battle log
* **Static Web Dashboard**: Live updates: top players & recent rounds, paginated by 10 records

---

## 🛠️ Setup & Local Development

1. **Clone the repo**

   ```bash
   git clone https://github.com/tu-usuario/onegup.git
   cd onegup
   ```

2. **Environment Variables**
   Create a `.env` in `bot/`:

   ```dotenv
   NODE_ENV=development
   TELEGRAM_TOKEN=yourTelegramBotToken
   SUPABASE_URL=https://your-instance.supabase.co
   SUPABASE_KEY=yourAnonOrServiceRoleKey
   SOLANA_RPC_URL=https://api.devnet.solana.com
   ```

3. **Install dependencies**

   ```bash
   cd bot
   npm install
   ```

4. **Run the bot**

   ```bash
   npm start
   ```

5. **Serve the front-end**

   ```bash
   cd ../web
   npx serve .
   ```

6. **View**

   * Bot: talk to it on Telegram
   * Front-end: open `http://localhost:5000` (or the port `serve` shows)

---

## 🎯 Deployment on Render

### Front-end (Static Site)

1. **New → Static Site** → Connect GitHub repo
2. **Root Directory**: `/web`
3. **Publish Directory**: `/web`
4. **Build Command**: *(leave empty)*

### Bot (Background Worker)

1. **New → Background Worker** → Same repo
2. **Root Directory**: `/bot`
3. **Build Command**: `npm ci`
4. **Start Command**: `npm start`
5. **Environment**: add same vars as in `.env`
6. **Always On**: Enabled

---

## 📖 Usage

* `/start` → Main menu: **Generate Wallet**, **Play Game**, **View Ranking**
* `/generate` → Verifies \$GUN, then returns your **game** keypair
* **Play Game** → Joins a 4-player session, waits for all to join, then triggers Russian Roulette
* **View Ranking** → Shows the top 5 players by wins

---

### Contributing

Pull requests welcome! Please follow standard GitHub flow:

1. Fork → Create `feature/*` branch → Commit → PR
2. Ensure linting/tests pass before merging

---

© 2025 One Gun Project. All rights reserved.
