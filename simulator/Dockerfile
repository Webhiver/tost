FROM node:22-alpine

WORKDIR /app

COPY package.json ./
COPY src ./src

ENV PORT=80
ENV HOST=0.0.0.0

EXPOSE 80

CMD ["node", "src/index.js"]
