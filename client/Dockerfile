# ==========================================
# Stage 1: Build React application
# ==========================================
FROM node:24-bookworm-slim AS builder

WORKDIR /app

# Install dependencies
COPY package*.json ./

RUN npm ci

# Copy frontend source
COPY . .

# Build production application
RUN npm run build


# ==========================================
# Stage 2: Production Nginx server
# ==========================================
FROM nginx:alpine AS production

# Remove default Nginx configuration
RUN rm /etc/nginx/conf.d/default.conf

# Copy custom Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy optimized React build
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
