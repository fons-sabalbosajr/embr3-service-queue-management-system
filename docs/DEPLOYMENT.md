# EMBR3 SQMS — Deployment Guide

> **Target environment:** Ubuntu 24.04 LTS VPS (72.61.125.232)
> This guide deploys the SQMS API as a new, isolated PM2 process **without
> touching any already-running applications** (`aqm-api`, `chordline-api`,
> `embr3-eswmp-api`, `embr3-hr-api`, `embr3-iis-api`, `embr3-ocsm-api`,
> `racatom-api`).

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Step 1 — Upload the Project](#step-1--upload-the-project)
3. [Step 2 — Install Backend Dependencies](#step-2--install-backend-dependencies)
4. [Step 3 — Configure Environment Variables](#step-3--configure-environment-variables)
5. [Step 4 — Register the API with PM2](#step-4--register-the-api-with-pm2)
6. [Step 5 — Build the Frontend](#step-5--build-the-frontend)
7. [Step 6 — Serve the Frontend with Nginx](#step-6--serve-the-frontend-with-nginx)
8. [Step 7 — Save PM2 State](#step-7--save-pm2-state)
9. [Updating the Application](#updating-the-application)
10. [Useful PM2 Commands](#useful-pm2-commands)

---

## Prerequisites

Ensure the following are already available on the server (they are, since other apps use them):

- Node.js >= 18 (`node -v`)
- npm (`npm -v`)
- PM2 (`pm2 -v`)
- Nginx (`nginx -v`)
- Git (`git --version`)

---

## Step 1 — Upload the Project

Choose **one** of the methods below.

### Option A — Git clone (recommended)

```bash
cd /var/www
git clone https://github.com/fons-sabalbosajr/embr3-service-queue-management-system.git embr3-sqms
```

### Option B — SCP / SFTP upload

Upload the entire project folder to `/var/www/embr3-sqms` from your local machine:

```bash
# Run locally
scp -r "D:/EMBR3_SQMS/embr3-service-queue-management-system" root@72.61.125.232:/var/www/embr3-sqms
```

---

## Step 2 — Install Backend Dependencies

```bash
cd /var/www/embr3-sqms/server
npm install --omit=dev
```

> Only production dependencies are installed. `nodemon` is a devDependency and
> is not needed in production.

---

## Step 3 — Configure Environment Variables

Create the `.env` file **inside the `server/` directory** — PM2 will pick it up automatically through `dotenv`.

```bash
nano /var/www/embr3-sqms/server/.env
```

Paste and fill in:

```env
# MongoDB
MONGO_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/embr3-sqms

# API port — choose a port NOT used by any other running app.
# Verify free ports first: ss -tlnp | grep LISTEN
PORT=5050

# JWT
JWT_SECRET=<long-random-secret>
JWT_EXPIRE=7d

# Nodemailer (transactional email)
EMAIL_HOST=smtp.example.com
EMAIL_PORT=587
EMAIL_USER=no-reply@yourdomain.com
EMAIL_PASS=<email-password>

# URL of the hosted frontend (used in password-reset email links)
CLIENT_URL=https://sqms.yourdomain.com
```

> **Port note:** Confirm `5050` is free before using it.
> ```bash
> ss -tlnp | grep 5050
> ```
> If output is empty, the port is available.

Restrict file permissions so only root can read the secrets:

```bash
chmod 600 /var/www/embr3-sqms/server/.env
```

---

## Step 4 — Register the API with PM2

Start the server as a **new PM2 process** named `embr3-sqms-api`. This is isolated from all existing PM2 processes.

```bash
cd /var/www/embr3-sqms/server
pm2 start server.js --name embr3-sqms-api
```

Verify it started without errors:

```bash
pm2 logs embr3-sqms-api --lines 30
```

You should see:
```
MongoDB connected
Server listening on port 5050
```

Quick health check:

```bash
curl http://localhost:5050/api/health
# Expected: {"status":"ok","database":"connected"}
```

---

## Step 5 — Build the Frontend

The React app must be compiled into static files before Nginx can serve it.

```bash
cd /var/www/embr3-sqms/front-end
npm install
npm run build
```

This produces a `dist/` directory at `/var/www/embr3-sqms/front-end/dist/`.

> **Before building**, update the API target in `vite.config.js` to point to
> the production server and port, or ensure the production Nginx config proxies
> `/api` to the correct backend port (see Step 6).

---

## Step 6 — Serve the Frontend with Nginx

Create a **new, isolated Nginx server block** for SQMS. This does not modify any existing site configurations.

```bash
nano /etc/nginx/sites-available/embr3-sqms
```

Paste the following (adjust the `server_name` and port as needed):

```nginx
server {
    listen 80;
    server_name sqms.yourdomain.com;   # or the server's public IP if no domain

    # Serve the built React SPA
    root /var/www/embr3-sqms/front-end/dist;
    index index.html;

    # SPA fallback — all routes return index.html
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Proxy API requests to the Express backend
    location /api/ {
        proxy_pass         http://127.0.0.1:5050;
        proxy_http_version 1.1;
        proxy_set_header   Host              $host;
        proxy_set_header   X-Real-IP         $remote_addr;
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
    }
}
```

Enable the site and reload Nginx:

```bash
# Create symlink (enable the site)
ln -s /etc/nginx/sites-available/embr3-sqms /etc/nginx/sites-enabled/embr3-sqms

# Test config — IMPORTANT: always test before reloading
nginx -t

# Reload only if test passes — this is a graceful reload, zero downtime
systemctl reload nginx
```

> `nginx -t` validates syntax. Only proceed to `reload` if output shows
> `syntax is ok` and `test is successful`. A failed config will **not**
> affect any running sites.

---

## Step 7 — Save PM2 State

Persist the updated PM2 process list so `embr3-sqms-api` restarts automatically after a server reboot:

```bash
pm2 save
```

Verify the saved state includes the new process:

```bash
pm2 status
```

You should now see `embr3-sqms-api` listed alongside all other existing processes with status `online`.

---

## Updating the Application

### Backend update

```bash
cd /var/www/embr3-sqms
git pull origin main             # pulls latest from GitHub

cd server
npm install --omit=dev

pm2 restart embr3-sqms-api       # restarts ONLY this app
pm2 logs embr3-sqms-api --lines 20
```

### Frontend update

```bash
cd /var/www/embr3-sqms/front-end
npm install
npm run build
# Nginx serves the new dist/ immediately — no Nginx reload required
```

---

## Useful PM2 Commands

All commands below operate **only on `embr3-sqms-api`** and do not affect other processes.

```bash
# View logs
pm2 logs embr3-sqms-api

# Restart the process
pm2 restart embr3-sqms-api

# Stop the process
pm2 stop embr3-sqms-api

# Delete the process from PM2 list
pm2 delete embr3-sqms-api

# View runtime details
pm2 show embr3-sqms-api

# Monitor CPU / memory in real time
pm2 monit
```
