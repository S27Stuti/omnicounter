# ⚡ OmniCounter — Modern Full-Stack Counter App

A clean, responsive, tactile counter web application powered by **Node.js + Express REST API** backend and modern vanilla frontend.

---

## 🛠️ Tech Stack

- **Backend**: Node.js, Express.js, REST API, JSON File Database (`/data/counters.json`)
- **Frontend**: Vanilla HTML5, CSS3, JavaScript (ES6+), Web Audio API synthesizer, Canvas Confetti
- **Storage**: Persistent backend JSON database with automatic client-side LocalStorage fallback

---

## 🚀 How to Run Locally

```bash
# 1. Install dependencies
npm install

# 2. Start the backend server
npm start
# or for development mode:
npm run dev
```

The application will be live at:
👉 **[http://localhost:3000](http://localhost:3000)**

---

## 📡 REST API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Server health & uptime |
| `GET` | `/api/counters` | Get all counters & active selection |
| `POST` | `/api/counters` | Create a new counter |
| `POST` | `/api/counters/active` | Change active counter ID |
| `PUT` | `/api/counters/:id` | Update counter name, target, or value |
| `POST` | `/api/counters/:id/step` | Increment/decrement counter or reset |
| `POST` | `/api/counters/:id/undo` | Undo last action on counter |
| `POST` | `/api/counters/:id/clear-history` | Clear activity history |
| `DELETE` | `/api/counters/:id` | Delete counter |

---

## 🌐 How to Deploy (Full-Stack / Backend)

Since the website now has a Node.js backend, you can deploy it for free to:

### 1. Render.com (Recommended)
1. Push your folder to GitHub.
2. Go to [Render.com](https://render.com) and click **New Web Service**.
3. Select your repository.
4. Set:
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
5. Click **Deploy**!

### 2. Railway.app
1. Go to [Railway.app](https://railway.app).
2. Click **New Project** → **Deploy from GitHub repo**.
3. Railway automatically detects `server.js` and deploys your website instantly.
