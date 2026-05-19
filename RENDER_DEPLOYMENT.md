# 🚀 SkillSense AI - Render Deployment Guide

This guide provides a detailed, step-by-step walkthrough for deploying the **SkillSense AI** platform to **Render**.

Because the Express backend is already configured to serve the compiled Vite frontend statically in production, you can deploy both services together under **one single Render Web Service**. This is highly cost-effective, eliminates CORS configuration headaches, and fits perfectly within the Render free tier!

---

## 📋 Prerequisites

Before starting, ensure you have:
1. A **GitHub** account and your repository pushed online (e.g., `https://github.com/your-username/SkillsenceAI`).
2. A **Render** account ([sign up here](https://render.com)).
3. A **MongoDB Atlas** account ([sign up here](https://www.mongodb.com/cloud/atlas)).

---

## 🛠️ Step 1: Set Up MongoDB Atlas (Database)

Render's web services do not include a built-in database, so you need a cloud-hosted MongoDB database.

1. **Create a Database & Cluster:**
   - Log in to MongoDB Atlas.
   - Create a new free cluster (shared tier).
   - Under **Database Access**, create a database user with read and write permissions (remember the username and password).

2. **Configure Network Access (Crucial!):**
   - Under **Network Access**, click **Add IP Address**.
   - Choose **Allow Access from Anywhere** (`0.0.0.0/0`).
   > [!IMPORTANT]
   > Since Render's free tier uses dynamic IP addresses, you **must** whitelist `0.0.0.0/0` in Atlas so the Render server can connect to your database.

3. **Get your Connection URI:**
   - Go to the **Database** tab, click **Connect** on your cluster, and choose **Drivers** (Node.js).
   - Copy the connection string. It will look like this:
     `mongodb+srv://<username>:<password>@cluster.xxxx.mongodb.net/skillsense?retryWrites=true&w=majority`
   - Replace `<username>` and `<password>` with your database user credentials. Keep this string ready.

---

## 🌐 Step 2: Deploy to Render as a Unified Service

Deploying the React frontend and Express backend as a single service is the recommended approach.

### 1. Create a New Web Service
- Log in to your Render Dashboard.
- Click **New +** in the top right and select **Web Service**.
- Connect your GitHub repository containing the SkillSense AI code.

### 2. Configure Service Settings
Fill in the deployment form with the following settings:

| Parameter | Configuration Value |
| :--- | :--- |
| **Name** | `skillsense-ai` *(or any unique name)* |
| **Region** | Choose the one closest to you (e.g., `Oregon (US West)` or `Frankfurt (EU)`) |
| **Branch** | `main` *(or whichever branch contains your production-ready code)* |
| **Runtime** | `Node` |
| **Build Command** | `npm run install:all && npm run build` |
| **Start Command** | `npm start` |
| **Instance Type** | `Free` *(or Starter if you prefer higher resources)* |

### 3. Add Environment Variables
Scroll down and click **Advanced** -> **Add Environment Variable**. Add the following key-value pairs:

| Key | Value | Description |
| :--- | :--- | :--- |
| `NODE_ENV` | `production` | Tells Node and Express to run in production mode and serve the frontend statically. |
| `MONGODB_URI` | `mongodb+srv://...` | Your MongoDB Atlas connection string from Step 1. |
| `JWT_SECRET` | `your_ultra_secure_secret_key` | A random, secure string for signing JWT tokens. |
| `ACCESS_TOKEN_EXPIRY` | `15m` | Expiry duration for the login access token. |
| `REFRESH_TOKEN_EXPIRY` | `7d` | Expiry duration for the login refresh token. |
| `FRONTEND_URL` | `https://skillsense-ai.onrender.com` | Replace with your actual Render app URL (shown on the Render dashboard once created). |
| `BACKEND_URL` | `https://skillsense-ai.onrender.com` | Same as the above (in a unified MERN deployment, frontend and backend share the same domain). |
| `OPENAI_API_KEY` | `sk-...` *(Optional)* | Your OpenAI API key for AI Resume and Interview features. |
| `GITHUB_TOKEN` | `ghp_...` *(Optional)* | Your GitHub Personal Access Token (PAT) for GitHub analysis features. |

> [!TIP]
> After your service is created, Render will generate a URL like `https://skillsense-ai.onrender.com`. You can update the `FRONTEND_URL` and `BACKEND_URL` values with this official URL.

---

## ⚡ Step 3: Trigger Build and Verify

1. Click **Create Web Service** at the bottom of the page.
2. Render will spin up the container, install all dependencies in root, backend, and frontend, compile the React build into `frontend/dist`, and start the Express server.
3. You can monitor the logs in real time. Once successful, you will see:
   `Backend listening on http://localhost:5000`
   and the status indicator will turn **Live** (green).
4. Visit your Render URL (e.g., `https://skillsense-ai.onrender.com`) to access your fully deployed application!

---

## 🔄 Alternative: Split Service Deployment (Frontend on Static Site, Backend on Web Service)

If you prefer to deploy the Frontend and Backend separately (e.g., to load the static UI extremely fast from Render's CDN), you can create two separate services:

### 1. Backend Service (Render Web Service)
* **Build Command:** `npm install --prefix backend`
* **Start Command:** `npm run start --prefix backend`
* **Env Variables:**
  * `NODE_ENV`: `production`
  * `MONGODB_URI`: *(Your Atlas String)*
  * `JWT_SECRET`: *(Your Secret)*
  * `FRONTEND_URL`: *(Your Frontend Static Site URL)*
  * `BACKEND_URL`: *(Your Backend Web Service URL)*

### 2. Frontend Service (Render Static Site)
* **Build Command:** `npm install --prefix frontend && npm run build --prefix frontend`
* **Publish Directory:** `frontend/dist`
* **Env Variables:**
  * `VITE_API_BASE_URL`: `https://your-backend.onrender.com` *(Points to your Backend Web Service URL)*

> [!NOTE]
> Since the frontend is a Single Page Application (SPA) using React Router, you will need to add a **Redirect Rule** in your Render Static Site settings under the **Redirects/Rewrites** tab:
> * **Source:** `/*`
> * **Destination:** `/index.html`
> * **Action:** `Rewrite`
> This prevents 404 errors when reloading sub-pages like `/dashboard` directly!

---

## 🔍 Post-Deployment Checklist

- [ ] **First User Creation:** When the server starts up, it automatically seeds sample admin, student, university, and recruiter accounts. You can log in with those or register a new account.
- [ ] **Render Free Tier Spin-Down:** If you are using the Render Free Tier, the web service will spin down (sleep) after 15 minutes of inactivity. The next visitor will experience a 50-60 second delay while the container wakes up. This is standard behavior for Free Tier instances.
- [ ] **Database Connection Check:** If you receive "Unable to reach the backend" on login, verify that `0.0.0.0/0` is successfully whitelisted in MongoDB Atlas and that your credentials in `MONGODB_URI` are exact.
