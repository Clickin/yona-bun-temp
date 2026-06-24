# syntax=docker/dockerfile:1.7

FROM node:24-bookworm-slim AS frontend
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY frontend/package.json ./frontend/
RUN pnpm install --frozen-lockfile
COPY frontend ./frontend
RUN pnpm --dir frontend build

FROM rust:1-bookworm AS builder
WORKDIR /app
COPY Cargo.toml Cargo.lock ./
COPY crates ./crates
COPY --from=frontend /app/frontend/dist ./frontend/dist
ENV YONA_EMBED_ASSET_ROOT=/app/frontend/dist
RUN cargo build --release -p yona-rust-pilot-server

FROM debian:bookworm-slim AS runtime
RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates curl git subversion \
    && rm -rf /var/lib/apt/lists/*

RUN useradd --system --create-home --home-dir /var/lib/yona --shell /usr/sbin/nologin yona
WORKDIR /var/lib/yona
COPY --from=builder /app/target/release/yona-rust-pilot-server /usr/local/bin/yona-rust-pilot-server

ENV YONA_BIND_ADDR=0.0.0.0:8089 \
    YONA_BASE_PATH=/ \
    YONA_DATABASE_URL=sqlite:/var/lib/yona/yona.sqlite?mode=rwc \
    YONA_SCHEMA_POLICY=up \
    YONA_USE_EMBEDDED_ASSETS=1

EXPOSE 8089
USER yona
CMD ["yona-rust-pilot-server"]
