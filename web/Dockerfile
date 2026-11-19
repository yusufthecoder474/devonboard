FROM node:24-alpine AS build
WORKDIR /app
# VITE_API_URL is baked into the client bundle at build time.
ARG VITE_API_URL=http://localhost:4000
ENV VITE_API_URL=$VITE_API_URL
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
