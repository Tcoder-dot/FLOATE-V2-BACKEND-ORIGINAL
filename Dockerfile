# Multi-stage Dockerfile for Node.js Express + Vite + Grammy Telegram Bot
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package manifests
COPY package*.json ./

# Install dependencies (use npm install to avoid lockfile mismatch issues during remote container builds)
RUN npm install

# Copy application source code
COPY . .

# Build Vite frontend assets and esbuild production server bundle
RUN npm run build

# Production stage
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Install system fonts for crystal-clear sharp/librsvg image rendering
RUN apk add --no-cache fontconfig ttf-dejavu ttf-liberation ttf-freefont font-noto

COPY package*.json ./

# Install production dependencies only
RUN npm install --omit=dev

# Copy built distribution assets and configs from builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/firebase-applet-config.json* ./

# Expose port 3000
EXPOSE 3000

# Start server
CMD ["node", "dist/server.cjs"]
