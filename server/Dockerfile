# ==========================================
# Stage 1: Install dependencies
# ==========================================
FROM node:24-bookworm-slim AS dependencies

WORKDIR /app

COPY package*.json ./

RUN npm ci --onnxruntime-node-install=skip


# ==========================================
# Stage 2: Build TypeScript application
# ==========================================
FROM node:24-bookworm-slim AS builder

WORKDIR /app

COPY --from=dependencies /app/node_modules ./node_modules

COPY package*.json ./
COPY tsconfig.json ./
COPY src ./src

RUN npm run build


# ==========================================
# Stage 3: Install production dependencies
# ==========================================
FROM node:24-bookworm-slim AS production-dependencies

WORKDIR /app

COPY package*.json ./

RUN npm ci --omit=dev --onnxruntime-node-install=skip \
    && npm cache clean --force


# ==========================================
# Stage 4: Production runtime
# ==========================================
FROM node:24-bookworm-slim AS production

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5000
ENV HF_HOME=/home/node/.cache/huggingface

# Install production dependencies.
COPY --from=production-dependencies \
    --chown=node:node \
    /app/node_modules ./node_modules

# Copy compiled application.
COPY --from=builder \
    --chown=node:node \
    /app/dist ./dist

# Include knowledge pack downloads.
COPY --chown=node:node public ./public

# Prepare Hugging Face model cache.
RUN mkdir -p /home/node/.cache/huggingface \
    && chown -R node:node /home/node/.cache

# Run without root privileges.
USER node

EXPOSE 5000

CMD ["node", "dist/server.js"]