FROM golang:1.22.2-alpine3.18 AS builder

WORKDIR /app

COPY . .

RUN go mod download
RUN go mod tidy

RUN go build -o main .

FROM alpine AS production

COPY --from=builder /app/main /app/main

EXPOSE 8080

ENTRYPOINT ["/app/main"]