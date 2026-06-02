# MyBlog web (Astro) — Linux container for reproducible dev/build.
# Build context MUST be the repo root: apps/web imports ../../packages and
# ../../public-data via relative paths, so the whole repo must be present.
#
#   docker build -f apps/web/Dockerfile -t myblog-web .

FROM node:22-bookworm-slim

# Tools some deps expect at install/build time.
RUN apt-get update && apt-get install -y --no-install-recommends \
        git ca-certificates \
    && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=development \
    # Astro/Vite watch over a bind mount on a non-Linux host needs polling
    # to detect file changes reliably. This is the fix for "process dies /
    # HMR stops seeing edits" on Windows-hosted bind mounts.
    CHOKIDAR_USEPOLLING=true \
    CHOKIDAR_INTERVAL=300 \
    # Give the JS heap room so long dev sessions don't OOM-exit.
    NODE_OPTIONS=--max-old-space-size=3072

WORKDIR /repo

# Install web deps first using only its manifest + lockfile, so this layer
# is cached unless dependencies actually change.
COPY apps/web/package.json apps/web/package-lock.json ./apps/web/
RUN cd apps/web && npm ci

# Bring in the rest of the repo (source is bind-mounted at runtime in dev;
# this COPY makes the image usable standalone for `build` too).
COPY . .

WORKDIR /repo/apps/web
EXPOSE 4321 6008

# Default: Astro dev server, reachable from the host.
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
