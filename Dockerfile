FROM node:20-slim

WORKDIR /app

COPY package.json ./
COPY server.js ./
COPY scripts ./scripts
COPY public ./public

RUN chmod +x scripts/entrypoint.sh \
    && useradd --create-home appuser && chown -R appuser:appuser /app
USER appuser

ENV PORT=8080
EXPOSE 8080

ENTRYPOINT ["scripts/entrypoint.sh"]
