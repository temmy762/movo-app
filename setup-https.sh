#!/bin/bash

# HTTPS Setup Script for Movo Privé
# This script automatically sets up Caddy with Let's Encrypt SSL

set -e

echo "=========================================="
echo "Movo Privé - HTTPS Setup Script"
echo "=========================================="
echo ""

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   echo "❌ This script must be run as root (use: sudo ./setup-https.sh)"
   exit 1
fi

# Get domain name from user
echo "Enter your domain name (e.g., movoprive.com):"
read -p "Domain: " DOMAIN

if [ -z "$DOMAIN" ]; then
    echo "❌ Domain cannot be empty!"
    exit 1
fi

echo ""
echo "Setting up HTTPS for: $DOMAIN"
echo "This will:"
echo "  ✓ Install Caddy"
echo "  ✓ Get a free SSL certificate from Let's Encrypt"
echo "  ✓ Redirect HTTP to HTTPS"
echo "  ✓ Auto-renew certificate"
echo ""
read -p "Continue? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Cancelled."
    exit 1
fi

echo ""
echo "Step 1: Installing Caddy..."
apt-get update -qq
apt-get install -y -qq caddy

echo "✓ Caddy installed"
echo ""

echo "Step 2: Creating Caddy configuration..."

# Create the Caddyfile
cat > /etc/caddy/Caddyfile << EOF
$DOMAIN www.$DOMAIN {
    reverse_proxy localhost:3000
    encode gzip
}
EOF

echo "✓ Configuration created"
echo ""

echo "Step 3: Starting Caddy..."
systemctl restart caddy
systemctl enable caddy

# Wait a moment for Caddy to start
sleep 2

# Check if Caddy is running
if systemctl is-active --quiet caddy; then
    echo "✓ Caddy is running"
else
    echo "❌ Caddy failed to start. Check logs:"
    journalctl -u caddy -n 20
    exit 1
fi

echo ""
echo "=========================================="
echo "✅ HTTPS Setup Complete!"
echo "=========================================="
echo ""
echo "Your site is now secure:"
echo "  🔒 https://$DOMAIN"
echo "  🔒 https://www.$DOMAIN"
echo ""
echo "What happens next:"
echo "  • Caddy got a free SSL certificate"
echo "  • HTTP requests auto-redirect to HTTPS"
echo "  • Certificate auto-renews every 90 days"
echo ""
echo "Test your site:"
echo "  curl -I https://$DOMAIN"
echo ""
echo "View Caddy logs:"
echo "  sudo journalctl -u caddy -f"
echo ""
echo "Edit configuration:"
echo "  sudo nano /etc/caddy/Caddyfile"
echo "  sudo systemctl reload caddy"
echo ""
