# Build context is the repo root (docker build -f server/Dockerfile .)
# so this stage can reach both server/ and the CSV data package.
#
# Runs the TypeScript source directly via tsx (same as local `npm run dev`),
# avoiding Node's native-ESM requirement for explicit ".js" import extensions
# that a plain `tsc` + `node dist/index.js` build would need.

FROM node:24-slim
WORKDIR /app
COPY server/package.json server/package-lock.json ./
# NODE_ENV must not be "production" yet here, or npm silently skips devDependencies
# (tsx, typescript) that this image needs to run the TypeScript source directly.
RUN npm ci
ENV NODE_ENV=production
ENV DATA_DIR=/app/data
COPY server/tsconfig.json ./
COPY server/src ./src
COPY Delivery_Hackathon_DataPackage_20260624 ./data
EXPOSE 3001
CMD ["npx", "tsx", "src/index.ts"]
