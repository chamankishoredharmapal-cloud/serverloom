# LoomServer — Deployment Guide (Render)

This project is deployed using:
- Render Web Service (Python)
- Render PostgreSQL (Free Tier)
- Cloudinary for media uploads
- Whitenoise for static files

---

## 1. Upload Code to GitHub

Make sure your repo contains:
- requirements.txt
- Procfile
- runtime.txt
- render.yaml (optional)
- loomserver/settings.py (production-ready)

---

## 2. Create PostgreSQL Database on Render

1. Go to Render → New → PostgreSQL
2. Choose Free Tier
3. Note the DATABASE_URL Render provides

Render injects DATABASE_URL automatically into your web service.

---

## 3. Create Web Service on Render

Use these settings:

- Build Command:
  `pip install -r requirements.txt`
- Start Command:
  `gunicorn loomserver.wsgi --log-file -`

Set environment variables:


