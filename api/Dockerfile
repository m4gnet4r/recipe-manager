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
# Cache mount so a retry after a mid-download network reset (seen with the
# large @prisma/engines postinstall download) resumes from what's already
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
