FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
# Variables de Vite: se "hornean" en el bundle en tiempo de build, no de arranque del contenedor.
# Google Sheets es opcional (si falta, el botón queda oculto). Firebase (login)
# NO es opcional en la práctica: sin esas variables nadie puede entrar a la app.
ARG VITE_GOOGLE_CLIENT_ID
ARG VITE_GOOGLE_SHEET_ID
ARG VITE_GOOGLE_SHEET_RANGE
ARG VITE_FIREBASE_API_KEY
ARG VITE_FIREBASE_AUTH_DOMAIN
ARG VITE_FIREBASE_PROJECT_ID
ARG VITE_FIREBASE_APP_ID
ENV VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID
ENV VITE_GOOGLE_SHEET_ID=$VITE_GOOGLE_SHEET_ID
ENV VITE_GOOGLE_SHEET_RANGE=$VITE_GOOGLE_SHEET_RANGE
ENV VITE_FIREBASE_API_KEY=$VITE_FIREBASE_API_KEY
ENV VITE_FIREBASE_AUTH_DOMAIN=$VITE_FIREBASE_AUTH_DOMAIN
ENV VITE_FIREBASE_PROJECT_ID=$VITE_FIREBASE_PROJECT_ID
ENV VITE_FIREBASE_APP_ID=$VITE_FIREBASE_APP_ID
RUN npm run build

FROM nginx:1.29-alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
HEALTHCHECK CMD wget -qO- http://127.0.0.1/ || exit 1