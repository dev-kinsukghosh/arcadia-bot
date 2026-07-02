# ── Stage 1: Install production dependencies ─────────────────────────
FROM node:22-slim AS deps

WORKDIR /app

# Copy only manifests first — layer cache survives code changes
COPY package.json package-lock.json ./

# Install production-only deps (no devDependencies)
# --ignore-scripts skips optional postinstall scripts we don't need
RUN npm ci --omit=dev --ignore-scripts

# ── Stage 2: Lean runtime image ──────────────────────────────────────
FROM node:22-slim AS runtime

# Security: run as non-root
RUN groupadd -r arcadia && useradd -r -g arcadia -m arcadia

WORKDIR /app

# Bring over production node_modules from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy application source (respects .dockerignore)
COPY package.json ./
COPY bot.js ./
COPY src/ ./src/
COPY scripts/ ./scripts/
COPY drizzle/ ./drizzle/
COPY drizzle.config.js ./

# Create dirs for runtime artifacts (icons cache, logs)
RUN mkdir -p src/icons logs && chown -R arcadia:arcadia /app

# Switch to non-root user
USER arcadia

# Node.js production optimizations
ENV NODE_ENV=production

# Entrypoint: deploy slash commands then start the bot
CMD ["npm", "start"]
