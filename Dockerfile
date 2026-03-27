# Build: Expo web static export (output: dist/)
# Debian (glibc), não Alpine (musl): lightningcss/NativeWind precisa do binário linux-x64-gnu no Metro.
FROM node:20-bookworm-slim AS builder

WORKDIR /app

ENV CI=true \
    EXPO_NO_TELEMETRY=1

# Injetado no bundle web em build time (configure no Dokploy em Build Args)
ARG EXPO_PUBLIC_API_URL
ENV EXPO_PUBLIC_API_URL=${EXPO_PUBLIC_API_URL}

COPY package.json package-lock.json .npmrc ./
# O lockfile (ex.: gerado no Windows) nem sempre grava os opcionais por plataforma; o lightningcss
# (NativeWind) resolve primeiro o pacote lightningcss-linux-x64-gnu — instalação explícita.
# Duas versões de lightningcss no lockfile: 1.31.1 (raiz) e 1.27.0 (react-native-css-interop).
RUN npm ci && \
    npm install --no-save lightningcss-linux-x64-gnu@1.31.1 && \
    npm install --no-save --prefix node_modules/react-native-css-interop/node_modules/lightningcss lightningcss-linux-x64-gnu@1.27.0

COPY . .
RUN NODE_ENV=production npm run build

# Run: arquivos estáticos + serve (SPA)
FROM node:20-bookworm-slim AS runner

WORKDIR /app

ENV NODE_ENV=production

RUN npm install -g serve@14

COPY --from=builder /app/dist ./dist

EXPOSE 3000

# Dokploy costuma definir PORT em runtime
CMD ["sh", "-c", "serve -s dist -l ${PORT:-3000}"]
