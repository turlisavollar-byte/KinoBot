# SSL Certificates Configuration

This directory should contain your SSL certificates for production deployment.

## Required Files

- `cert.pem` - SSL certificate file
- `key.pem` - SSL private key file

## How to Obtain SSL Certificates

### Option 1: Let's Encrypt (Free)

```bash
# Install certbot
sudo apt-get install certbot

# Generate certificate
sudo certbot certonly --standalone -d yourdomain.com

# Copy certificates to this directory
sudo cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem cert.pem
sudo cp /etc/letsencrypt/live/yourdomain.com/privkey.pem key.pem

# Set proper permissions
sudo chmod 644 cert.pem
sudo chmod 600 key.pem
```

### Option 2: Commercial SSL

Purchase SSL certificate from a provider (e.g., DigiCert, Comodo, GoDaddy) and place the files here.

### Option 3: Self-Signed (Testing Only)

```bash
# Generate self-signed certificate (NOT for production)
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout key.pem \
  -out cert.pem \
  -subj "/C=US/ST=State/L=City/O=Organization/CN=localhost"
```

## Security Notes

- **NEVER** commit `key.pem` to version control
- Keep private key file permissions restricted (600)
- Use strong SSL certificates (RSA 2048+ or ECC)
- Enable automatic certificate renewal for Let's Encrypt

## Testing SSL Configuration

```bash
# Test nginx configuration
docker-compose config

# Test SSL certificate
openssl s_client -connect localhost:443 -servername yourdomain.com
```

## Automation

Consider setting up automatic SSL certificate renewal with certbot:

```bash
# Add cron job for automatic renewal
0 0 * * * certbot renew --quiet && docker-compose restart nginx
```
