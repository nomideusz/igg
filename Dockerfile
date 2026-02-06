FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
# Install build dependencies for better-sqlite3
RUN apk add --no-cache python3 make g++
RUN npm ci

COPY . .
RUN npm run build
RUN npm prune --production

FROM node:20-alpine

WORKDIR /app

# Runtime dependencies for better-sqlite3
# (sqlite3 libs are usually statically linked in better-sqlite3, but python/make not needed for runtime)
# However, sometimes native bindings need shared libs. Alpine is minimal.
# usually just copying node_modules works if arch is same.

COPY --from=builder /app/build build/
COPY --from=builder /app/node_modules node_modules/
COPY package.json .
COPY drizzle drizzle/

EXPOSE 3000
ENV NODE_ENV=production
ENV DATA_DIR=/data
ENV BODY_SIZE_LIMIT=Infinity

CMD ["node", "build"]
