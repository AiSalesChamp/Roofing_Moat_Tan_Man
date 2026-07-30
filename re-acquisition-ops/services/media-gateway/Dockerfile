FROM node:22-alpine
WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev
COPY index.js ./
ENV PORT=3081
EXPOSE 3081
CMD ["node", "index.js"]
