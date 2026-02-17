FROM node:20-alpine
WORKDIR /app

COPY package.json package-lock.json* ./
COPY prisma ./prisma
RUN npm install --include=dev --no-audit --no-fund \
  && node -e "require.resolve('next/dist/bin/next')" \
  && node -e "require.resolve('prisma/build/index.js')"

COPY . .
RUN npm run build
EXPOSE 3000
CMD ["sh", "-c", "npx prisma db push && npm run start"]
