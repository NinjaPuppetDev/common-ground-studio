# Common Ground

> **Find the ground between your company and the companies you want to work with.**

Common Ground is an AI-powered enterprise market intelligence, competitive positioning, and cartographic alignment platform. It performs deep crawl investigations across prospective partners and target clients to uncover shared strategic goals, structural synergies, capability gaps, and evidence-backed positioning hypotheses.

---

## Features

- **Cartographic Positioning Engine**: Interactive Plan Position Indicator (PPI) radar visualization mapping strategic resonance, capability overlaps, and competitive friction points.
- **Deep Evidence Crawler**: Multi-step investigative pipeline combining web analysis, structural teardowns, executive quotes, job postings, and press release extractions.
- **Hypothesis Generation & Pitch Angles**: Synthesizes verified evidence into tailored pitch decks, integration angles, founder perspectives, and outreach playbooks.
- **PDF Report Generation**: Clean, client-ready PDF summaries generated directly in the browser with full typography and citation indices.
- **Authentication & Security**:
  - Google OAuth 2.0 (via Supabase) and Email/Password authentication.
  - Secure time-limited password recovery.
  - PKCE authentication flow and automatic session token rotation.
- **Tiered Rate Limiting**:
  - **Guest Users**: 1 free deep investigation with an automatic sign-in gate.
  - **Authenticated Users**: Hourly allowance with live quota tracking in the navigation bar.
  - **Admin Exemption**: Continuous, unlimited access for designated admin emails (`raigoza.david.j@gmail.com`).
- **Dark / Light Mode**: Unified theme synchronization with tailored military/tactical aesthetics and clean high-contrast presentation.

---

## Environment Variables

Copy `.env.example` to create your local `.env` file before starting the application:

```bash
cp .env.example .env
```

| Variable | Description |
| :--- | :--- |
| `GEMINI_API_KEY` | Google Gemini API key for running deep LLM reasoning and synthesis. |
| `GROQ_API_KEY` | *(Optional)* Groq API key for high-speed inference fallbacks. |
| `VITE_SUPABASE_URL` | Supabase project URL for authentication and backend services. |
| `VITE_SUPABASE_ANON_KEY` | Supabase public anonymous API key for client-side Auth and PKCE flows. |
| `ADMIN_EMAILS` | Comma-separated list of admin email addresses exempted from rate limits. |

> **Security Note**: Never commit your `.env` file. Only `.env.example` should be tracked in version control.

---

## Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Run the Development Server

```bash
npm run dev
```

The application will be accessible at `http://localhost:3000`.

### 3. Build for Production

```bash
npm run build
npm start
```

---

## Tech Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS, Lucide Icons, Canvas API, jsPDF.
- **Backend / API**: Express.js with Vite middleware, Server-Sent Events (SSE) streaming.
- **AI Models**: Google GenAI SDK (`@google/genai`).
- **Auth & Storage**: Supabase (`@supabase/supabase-js`).
