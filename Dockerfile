# syntax=docker/dockerfile:1.7

FROM node:24-bookworm-slim AS frontend
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY frontend/package.json ./frontend/
RUN pnpm install --frozen-lockfile
COPY frontend ./frontend
COPY yona-original/app/assets/stylesheets/usermenu.less ./yona-original/app/assets/stylesheets/usermenu.less
COPY yona-original/app/assets/stylesheets/yobi.less ./yona-original/app/assets/stylesheets/yobi.less
COPY yona-original/app/assets/stylesheets/less ./yona-original/app/assets/stylesheets/less
COPY yona-original/public/bootstrap/css/bootstrap.css ./yona-original/public/bootstrap/css/bootstrap.css
COPY yona-original/public/bootstrap/css/bootstrap-responsive.css ./yona-original/public/bootstrap/css/bootstrap-responsive.css
COPY yona-original/public/javascripts/lib/magnific-popup/magnific-popup.css ./yona-original/public/javascripts/lib/magnific-popup/magnific-popup.css
COPY yona-original/public/javascripts/lib/nprogress/nprogress.css ./yona-original/public/javascripts/lib/nprogress/nprogress.css
COPY yona-original/public/javascripts/lib/pikaday/pikaday.css ./yona-original/public/javascripts/lib/pikaday/pikaday.css
COPY yona-original/public/javascripts/lib/select2/select2.css ./yona-original/public/javascripts/lib/select2/select2.css
COPY yona-original/public/javascripts/lib/viewerjs/viewer.css ./yona-original/public/javascripts/lib/viewerjs/viewer.css
COPY yona-original/public/stylesheets/dynatree/skin/ui.dynatree.css ./yona-original/public/stylesheets/dynatree/skin/ui.dynatree.css
COPY yona-original/public/stylesheets/yobicon/style.css ./yona-original/public/stylesheets/yobicon/style.css
COPY yona-original/conf/messages ./yona-original/conf/messages
COPY yona-original/conf/messages.ja-JP ./yona-original/conf/messages.ja-JP
COPY yona-original/conf/messages.ko-KR ./yona-original/conf/messages.ko-KR
COPY yona-original/conf/messages.ru-RU ./yona-original/conf/messages.ru-RU
COPY yona-original/conf/messages.uz-UZ ./yona-original/conf/messages.uz-UZ
RUN pnpm --dir frontend build

FROM rust:1-bookworm AS builder
WORKDIR /app
COPY Cargo.toml Cargo.lock ./
COPY crates ./crates
COPY --from=frontend /app/frontend/dist ./frontend/dist
COPY --from=frontend /app/yona-original/conf/messages ./yona-original/conf/messages
COPY --from=frontend /app/yona-original/conf/messages.ja-JP ./yona-original/conf/messages.ja-JP
COPY --from=frontend /app/yona-original/conf/messages.ko-KR ./yona-original/conf/messages.ko-KR
COPY --from=frontend /app/yona-original/conf/messages.ru-RU ./yona-original/conf/messages.ru-RU
COPY --from=frontend /app/yona-original/conf/messages.uz-UZ ./yona-original/conf/messages.uz-UZ
ENV YONA_EMBED_ASSET_ROOT=/app/frontend/dist
RUN cargo build --release -p yoram-server --bin yoram --no-default-features --features mysql

FROM debian:bookworm-slim AS runtime
RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates curl git subversion \
    && rm -rf /var/lib/apt/lists/*

RUN useradd --system --create-home --home-dir /var/lib/yona --shell /usr/sbin/nologin yona
WORKDIR /var/lib/yona
COPY --from=builder /app/target/release/yoram /usr/local/bin/yoram

ENV YONA_BIND_ADDR=0.0.0.0:8089 \
    YONA_BASE_PATH=/ \
    YONA_DATABASE_URL=sqlite:/var/lib/yona/yona.sqlite?mode=rwc \
    YONA_SCHEMA_POLICY=up \
    YONA_USE_EMBEDDED_ASSETS=1

EXPOSE 8089
USER yona
CMD ["yoram"]
