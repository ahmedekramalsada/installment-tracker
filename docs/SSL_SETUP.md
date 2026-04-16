# 🔒 Setup HTTPS with SSL Certificate

This guide shows how to set up free SSL (HTTPS) using Let's Encrypt and nginx.

## Prerequisites

- A domain name pointing to your server
- Server with port 80 and 443 open
- Nginx installed

## Step 1: Install nginx and certbot

```bash
sudo apt update
sudo apt install -y nginx certbot python3-certbot-nginx
```

## Step 2: Configure nginx

Create a config file:

```bash
sudo nano /etc/nginx/sites-available/your-domain
```

Add this (replace `your-domain.com` with your actual domain):

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## Step 3: Enable the site

```bash
sudo ln -sf /etc/nginx/sites-available/your-domain /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

## Step 4: Get SSL Certificate

**Important:** Your domain DNS must point to the server before running this!

```bash
sudo certbot --nginx -d your-domain.com --non-interactive --agree-tos --email your-email@example.com
```

If successful, you'll see:

```
Successfully received certificate.
Certificate is saved at: /etc/letsencrypt/live/your-domain.com/fullchain.pem
Deploying certificate...
Congratulations! You have successfully enabled HTTPS.
```

## Step 5: Verify

```bash
curl -s -o /dev/null -w "%{http_code}" https://your-domain.com/health
```

Should return `200`.

---

## Auto-Renewal

Certbot automatically renews your certificate. To test:

```bash
sudo certbot renew --dry-run
```

Certificates are valid for 90 days. Certbot runs twice daily and will renew if within 30 days of expiry.

---

## Troubleshooting

### DNS not pointing error
- Wait for DNS to propagate (can take minutes to hours)
- Check your domain A record points to server IP: `dig your-domain.com`

### Port already in use
```bash
sudo lsof -i :80
sudo fuser -k 80/tcp
```

### Certificate won't issue
- Make sure port 80 is open in firewall: `sudo ufw allow 80/tcp`

---

## Nginx Config Location

- Config files: `/etc/nginx/sites-available/`
- Enabled sites: `/etc/nginx/sites-enabled/`
- Main config: `/etc/nginx/nginx.conf`

## Useful Commands

```bash
sudo nginx -t          # Test config
sudo systemctl restart nginx   # Restart nginx
sudo certbot renew   # Manual renewal
```