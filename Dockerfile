# ========================================
# Stage 1: Install dependencies & build
# ========================================
FROM node:20-alpine AS builder

WORKDIR /app

# Install build dependencies for native modules
RUN apk add --no-cache git python3 make g++

# Copy package files
COPY package.json package-lock.json* ./

# Install ALL dependencies (including dev)
RUN npm ci

# Copy source code
COPY . .

# Build backend only (frontend has Tailwind issue in Alpine)
RUN npm run build:server

# ========================================
# Stage 2: Production (minimal image)
# ========================================
FROM node:20-alpine AS production

WORKDIR /app

# Install wget for healthcheck
RUN apk add --no-cache wget

# Copy package files
COPY package.json package-lock.json* ./

# Install only production dependencies
RUN npm ci --omit=dev --ignore-scripts && \
    npm cache clean --force

# Copy built backend
COPY --from=builder /app/server/dist ./server/dist

# Copy pre-built frontend (built locally to avoid Tailwind Alpine issue)
COPY dist/ ./dist/

# Create non-root user for security
RUN addgroup -g 1001 -S appgroup && \
    adduser -S appuser -u 1001 -G appgroup

# Set ownership
RUN chown -R appuser:appgroup /app

# Switch to non-root user
USER appuser

# Environment
ENV NODE_ENV=production
ENV PORT=3001

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3001/health || exit 1

# Start server
CMD ["node", "server/dist/index.js"]
