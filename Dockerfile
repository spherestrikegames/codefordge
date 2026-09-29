FROM node:20-alpine

WORKDIR /app

# Install dependencies with legacy peer deps support
COPY package.json .npmrc* ./
RUN npm install --legacy-peer-deps

# Copy application sources
COPY . .

# Build client bundle
RUN npm run build

EXPOSE 3000

ENV PORT=3000
ENV NODE_ENV=production

CMD ["npm", "run", "dev"]
