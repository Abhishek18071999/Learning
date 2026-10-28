# ---- build stage: full Rust toolchain, compiles a release binary ----
FROM rust:1.99-slim AS build
WORKDIR /app
COPY Cargo.toml ./
COPY src ./src
RUN cargo build --release

# ---- runtime stage: only glibc + CA certificates + the binary (tens of MB, not hundreds) ----
FROM gcr.io/distroless/cc-debian12
COPY --from=build /app/target/release/news-service /usr/local/bin/news-service
USER nonroot:nonroot
EXPOSE 3000
ENTRYPOINT ["/usr/local/bin/news-service"]
