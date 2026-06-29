# ---- Build stage: compile the React frontend ----
FROM node:20-slim AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# ---- Runtime stage: only what's needed to serve + run the API ----
FROM node:20-slim
WORKDIR /app
ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=build /app/dist ./dist
COPY server ./server

# Cloud Run injects PORT; the server reads it via process.env.PORT
EXPOSE 8080
CMD ["node", "server/index.js"]
