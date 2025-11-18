# Dockerfile for Bulwark 1475
# This creates a lightweight container to serve the static game files

FROM nginx:alpine

# Copy game files to nginx html directory
COPY . /usr/share/nginx/html/

# Copy custom nginx configuration (optional)
# COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 80
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost/ || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
