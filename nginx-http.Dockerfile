FROM nginx:alpine

# Install envsubst for template processing
RUN apk add --no-cache gettext

# Copy the nginx configuration template for HTTP only
COPY nginx-http-only.conf.template /etc/nginx/nginx.conf.template

# Create entrypoint script to process template
RUN printf '#!/bin/sh\n\
# Process nginx config template with environment variables\n\
envsubst "\$SERVER_NAME \$DOMAIN_NAME \$BACKEND_HOST \$BACKEND_PORT \$CLIENT_MAX_BODY_SIZE \$API_RATE_LIMIT \$WEBHOOK_RATE_LIMIT \$CONNECTION_LIMIT" < /etc/nginx/nginx.conf.template > /etc/nginx/nginx.conf\n\
\n\
# Debug: Show processed config\n\
echo "Processed nginx.conf (first 100 lines):"\n\
cat /etc/nginx/nginx.conf | head -100\n\
\n\
# Start nginx\n\
exec nginx -g "daemon off;"\n' > /docker-entrypoint.sh && \
    chmod +x /docker-entrypoint.sh

ENTRYPOINT ["/docker-entrypoint.sh"]