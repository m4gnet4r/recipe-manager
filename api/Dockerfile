FROM node:20-alpine AS base
# Prisma's query/schema engines need libssl, which the base alpine image
# doesn't include — without this, Prisma can't detect the OpenSSL version
# and generates a mismatched engine.
RUN apk add --no-cache openssl
WORKDIR /app
COPY package*.json ./
COPY prisma ./prisma
RUN npm config set fetch-retries 5 \
  && npm config set fetch-retry-mintimeout 10000 \
  && npm config set fetch-retry-maxtimeout 60000
# @prisma/engines' own postinstall script proactively downloads engine
# binaries for a broad default platform set, and a mid-download reset there
# throws an *uncaught* rejection that kills `npm install` outright before
# npm's own retry logic gets a chance (seen repeatedly on this network).
# Scoping it to only the two targets schema.prisma actually declares
# (binaryTargets) cuts the download to a fraction of the size, which both
# finishes faster and is far less likely to land mid-stream during a reset.
# "native" (used in schema.prisma's binaryTargets) isn't a literal this env
# var accepts for its own prefetch step — it needs the concrete platform id.
# This build always runs on Alpine (linux-musl), which IS what "native"
# resolves to at `prisma generate` time, so one explicit target covers both.
ENV PRISMA_CLI_BINARY_TARGETS=linux-musl-openssl-3.0.x
# Cache mount so a retry after a network reset resumes from what's already
# fetched instead of starting the npm cache over from zero.
RUN --mount=type=cache,target=/root/.npm npm install
COPY . .
RUN npm run prisma:generate
RUN npm run build
RUN npm run build:seed

FROM node:20-alpine
RUN apk add --no-cache openssl
WORKDIR /app
ENV NODE_ENV=production
COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/dist ./dist
COPY --from=base /app/prisma ./prisma
COPY --from=base /app/package*.json ./
COPY --from=base /app/docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

EXPOSE 4000
ENTRYPOINT ["./docker-entrypoint.sh"]
