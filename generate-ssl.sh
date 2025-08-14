#!/bin/bash

# Create certbot directories if they don't exist
mkdir -p certbot/conf certbot/www

echo "Generating SSL certificates for app.pytake.net and api.pytake.net..."

# Generate certificate for api.pytake.net
echo "Generating certificate for api.pytake.net..."
docker run --rm --name certbot \
    -v "$(pwd)/certbot/conf:/etc/letsencrypt" \
    -v "$(pwd)/certbot/www:/var/www/certbot" \
    certbot/certbot certonly \
    --webroot \
    --webroot-path=/var/www/certbot \
    --email admin@pytake.net \
    --agree-tos \
    --no-eff-email \
    --force-renewal \
    -d api.pytake.net

# Generate certificate for app.pytake.net
echo "Generating certificate for app.pytake.net..."
docker run --rm --name certbot \
    -v "$(pwd)/certbot/conf:/etc/letsencrypt" \
    -v "$(pwd)/certbot/www:/var/www/certbot" \
    certbot/certbot certonly \
    --webroot \
    --webroot-path=/var/www/certbot \
    --email admin@pytake.net \
    --agree-tos \
    --no-eff-email \
    --force-renewal \
    -d app.pytake.net

echo "SSL certificate generation completed!"
echo "Certificates are stored in ./certbot/conf/"

# List generated certificates
ls -la certbot/conf/live/