FROM ubuntu:22.04

ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update \
    && apt-get install -y --no-install-recommends curl ca-certificates gnupg \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y --no-install-recommends nodejs \
    && rm -rf /var/lib/apt/lists/*

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
