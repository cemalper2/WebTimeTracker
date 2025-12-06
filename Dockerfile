# Multi-stage build for Time Tracker
FROM nginx:alpine

# Copy application files to nginx html directory
COPY index.html /usr/share/nginx/html/
COPY index.css /usr/share/nginx/html/
COPY app.js /usr/share/nginx/html/
COPY components/ /usr/share/nginx/html/components/
COPY services/ /usr/share/nginx/html/services/
COPY utils/ /usr/share/nginx/html/utils/

# Expose port 80
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
