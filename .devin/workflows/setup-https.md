---
description: Setup HTTPS with Let's Encrypt and Nginx reverse proxy
---

# Setup HTTPS for Movo Privé

## Prerequisites
- Domain name pointing to your VPS IP
- SSH access to your VPS
- Root or sudo access

## Option 1: Using Caddy (Easiest - Recommended)

Caddy automatically handles HTTPS with Let's Encrypt renewal.

### Step 1: Install Caddy
```bash
sudo apt update
sudo apt install -y caddy
```

### Step 2: Create Caddyfile
```bash
sudo nano /etc/caddy/Caddyfile
```

Add this content (replace `movoprive.com` with your domain):
```
movoprive.com www.movoprive.com {
    reverse_proxy localhost:3000
    encode gzip
}
```

### Step 3: Start Caddy
```bash
sudo systemctl restart caddy
sudo systemctl enable caddy
```

### Step 4: Verify
```bash
sudo systemctl status caddy
```

That's it! Caddy will automatically:
- Get an SSL certificate from Let's Encrypt
- Renew it automatically
- Redirect HTTP to HTTPS
- Proxy requests to your Next.js app on port 3000

---

## Option 2: Using Nginx + Let's Encrypt (More Control)

### Step 1: Install Nginx and Certbot
```bash
sudo apt update
sudo apt install -y nginx certbot python3-certbot-nginx
```

### Step 2: Create Nginx Config
```bash
sudo nano /etc/nginx/sites-available/movoprive
```

Add this content (replace `movoprive.com` with your domain):
```nginx
server {
    server_name movoprive.com www.movoprive.com;
    
    location / {
        proxy_pass http://localhost:3000;
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

### Step 3: Enable the Site
```bash
sudo ln -s /etc/nginx/sites-available/movoprive /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### Step 4: Get SSL Certificate
```bash
sudo certbot --nginx -d movoprive.com -d www.movoprive.com
```

Follow the prompts and choose to redirect HTTP to HTTPS.

### Step 5: Verify Auto-Renewal
```bash
sudo systemctl enable certbot.timer
sudo certbot renew --dry-run
```

---

## Verify HTTPS is Working

After setup, test your site:

```bash
# Check if HTTPS works
curl -I https://movoprive.com

# Check certificate
openssl s_client -connect movoprive.com:443 -servername movoprive.com
```

---

## Troubleshooting

### Certificate not issued
- Make sure your domain DNS points to your VPS IP
- Check firewall allows ports 80 and 443
- Check logs: `sudo journalctl -u caddy -n 50` or `sudo tail -f /var/log/nginx/error.log`

### Still showing "Not Secure"
- Clear browser cache (Ctrl+Shift+Delete)
- Try incognito/private window
- Check certificate: click lock icon → Certificate

### PM2 App Still Running
Make sure your Next.js app is still running:
```bash
pm2 status
pm2 logs movo
```

---

## Next Steps

1. Choose Option 1 (Caddy) or Option 2 (Nginx)
2. Run the commands on your VPS
3. Test: `https://movoprive.com`
4. Verify no "Not Secure" warning

