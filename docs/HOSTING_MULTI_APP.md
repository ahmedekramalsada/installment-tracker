# 🌐 Host Multiple Apps on One Server

## Method 1: Nginx + Subdomains (Recommended)

**What it does:** Routes different subdomains to different apps on different ports.

### DNS Setup
Add A records in your domain settings:
```
install.example.com  →  YOUR_SERVER_IP
courses.example.com  →  YOUR_SERVER_IP
```

### Nginx Config
File: `/etc/nginx/sites-available/multi-app.conf`

```nginx
# ── App 1: Installment Tracker ──
server {
    listen 80;
    server_name install.example.com;

    location / {
        proxy_pass http://127.0.0.1:5173;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}

# ── App 2: Course Website ──
server {
    listen 80;
    server_name courses.example.com;

    location / {
        proxy_pass http://127.0.0.1:5174;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:3002;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

### Enable & Test
```bash
sudo ln -s /etc/nginx/sites-available/multi-app.conf /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### Add HTTPS (Free)
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d install.example.com -d courses.example.com
```

---

## Method 2: Docker Compose (All apps in containers)

**What it does:** Runs multiple apps with Docker Compose, each on its own port.

### `docker-compose.multi.yml`
```yaml
services:
  # ── App 1: Installment Tracker ──
  installment-app:
    build: ./installment-tracker
    container_name: installment-app
    environment:
      - NODE_ENV=production
      - SUPABASE_URL=${INSTALL_SUPABASE_URL}
      - SUPABASE_SERVICE_ROLE_KEY=${INSTALL_SUPABASE_KEY}
      - JWT_SECRET=${INSTALL_JWT_SECRET}
    expose:
      - "3001"
    restart: unless-stopped
    networks:
      - apps

  # ── App 2: Course Website ──
  course-app:
    build: ./course-website
    container_name: course-app
    environment:
      - NODE_ENV=production
      - SUPABASE_URL=${COURSE_SUPABASE_URL}
      - SUPABASE_SERVICE_ROLE_KEY=${COURSE_SUPABASE_KEY}
      - JWT_SECRET=${COURSE_JWT_SECRET}
    expose:
      - "3002"
    restart: unless-stopped
    networks:
      - apps

  # ── Nginx Reverse Proxy ──
  nginx:
    image: nginx:alpine
    container_name: multi-app-nginx
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./docker/multi-app-nginx.conf:/etc/nginx/conf.d/default.conf:ro
      - ./docker/certbot/conf:/etc/letsencrypt:ro
      - ./docker/certbot/www:/var/www/certbot:ro
    depends_on:
      - installment-app
      - course-app
    restart: unless-stopped
    networks:
      - apps

networks:
  apps:
    driver: bridge
```

### `docker/multi-app-nginx.conf`
```nginx
upstream installment {
    server installment-app:3001;
}

upstream course {
    server course-app:3002;
}

server {
    listen 80;
    server_name install.example.com;

    location / {
        proxy_pass http://installment;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}

server {
    listen 80;
    server_name courses.example.com;

    location / {
        proxy_pass http://course;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### Start everything
```bash
docker compose -f docker-compose.multi.yml up -d --build
```

---

## Method 3: IP + Port Direct (No domain needed)

**What it does:** Access each app directly via IP and port.

### Ports layout
```
Installment Tracker frontend  →  Port 5173
Installment Tracker API       →  Port 3001
Course Website frontend       →  Port 5174
Course Website API            →  Port 3002
```

### Open firewall
```bash
sudo ufw allow 3001/tcp
sudo ufw allow 3002/tcp
sudo ufw allow 5173/tcp
sudo ufw allow 5174/tcp
sudo ufw reload
```

### Also open in cloud provider security group
- AWS EC2 → Security Groups → Inbound Rules
- DigitalOcean → Networking → Firewalls
- Oracle Cloud → VCN → Security Lists

### URLs
```
http://YOUR_IP:5173   →  Installment Tracker
http://YOUR_IP:5174   →  Course Website
```

⚠️ **No HTTPS, no subdomains** — just IP + port. Good for testing, bad for production.

---

## Summary: Which to Choose?

| Method | Needs Domain? | HTTPS? | Difficulty | Best For |
|--------|:-------------:|:------:|:----------:|----------|
| **Nginx + Subdomains** | ✅ Yes | ✅ Free | ⭐⭐ Easy | Production |
| **Docker Compose** | ✅ Yes | ✅ Free | ⭐⭐⭐ Medium | Production (containerized) |
| **IP + Port Direct** | ❌ No | ❌ No | ⭐ Simplest | Testing / Dev |
