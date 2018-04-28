FROM node:9.5.0-alpine as bot_build
LABEL maintainer="John Barker <john@johnbarker.in>"

RUN apk update && apk add curl
RUN mkdir -p /var/bot

ENV NODE_ENV production

WORKDIR /var/bot

COPY package.json yarn.lock ./
RUN yarn install && yarn cache clean

FROM bot_build

WORKDIR /var/bot

COPY --from=bot_build /var/bot ./

CMD ["yarn", "run", "start"]