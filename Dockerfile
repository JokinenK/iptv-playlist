FROM node:10.18.0-alpine3.11
WORKDIR /usr/src/app

COPY package.json .
RUN npm install --quiet

COPY . .