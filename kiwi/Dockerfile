FROM node:20.14.0-alpine3.20 as dependencies

WORKDIR /build

COPY package*.json ./
COPY prisma ./prisma/

RUN npm ci

FROM dependencies as build

COPY . .

RUN npm run build

FROM node:20.14.0-alpine3.20 as production

WORKDIR /app

COPY --from=build /build/dist /app/dist
COPY --from=build /build/package*.json /app
COPY --from=build /build/node_modules /app/node_modules
COPY --from=build /build/prisma /app/prisma

ENV DATABASE_URL=
ENV PORT=3000
ENV JWT_SECRET=
ENV SESSION_SECRET=
ENV GOOGLE_CLIENT_ID=
ENV GOOGLE_CLIENT_SECRET=
ENV GOOGLE_CALLBACK_URL=
ENV GOOGLE_DOMAIN=
ENV LLM_API_KEY=
ENV LLM_BASE_URL=
ENV LLM_EMBEDDING_MODEL=
ENV LLM_CHAT_MODEL=
ENV UNSTRUCTURED_API_URL=
ENV FRONTEND_URL=
ENV COMPETITION_API_URL=

EXPOSE 3000

CMD ["npm", "run", "start:prod"]
