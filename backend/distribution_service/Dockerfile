# Multi-stage build для C++ сервиса распределения студентов.
# Builder ставит cmake/g++/dev-зависимости и собирает бинарь;
# runtime берёт чистую ubuntu:22.04 + только нужные shared libs.

FROM ubuntu:22.04 AS builder

ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    cmake \
    libcurl4-openssl-dev \
    nlohmann-json3-dev \
    libcpp-httplib-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /src
COPY . .

RUN cmake -B build -DCMAKE_BUILD_TYPE=Release \
    && cmake --build build -j"$(nproc)"

# ─────────────────────────────────────────────────────────────

FROM ubuntu:22.04 AS runtime

ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update && apt-get install -y --no-install-recommends \
    libcurl4 \
    libcpp-httplib0 \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY --from=builder /src/build/distribution_service /app/distribution_service
COPY --from=builder /src/config/distribution_service.json /app/config/distribution_service.json
RUN mkdir -p /app/logs

EXPOSE 8090

CMD ["/app/distribution_service", "/app/config/distribution_service.json"]
