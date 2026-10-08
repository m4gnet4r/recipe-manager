FROM node:20-alpine AS base
WORKDIR /app
COPY package*.json ./
RUN npm config set fetch-retries 5 \
  && npm config set fetch-retry-mintimeout 10000 \
  && npm config set fetch-retry-maxtimeout 60000 \
  && npm install
COPY . .
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
RUN npm run build

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=base /app/.next/standalone ./
COPY --from=base /app/.next/static ./.next/static
COPY --from=base /app/public ./public

EXPOSE 3000
CMD ["node", "server.js"]
