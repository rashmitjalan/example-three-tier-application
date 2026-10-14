# Contributing

## Run locally

- Install [Docker Desktop](https://www.docker.com/products/docker-desktop/) (or Docker Engine with the Compose plugin), then start the stack with `docker compose up --build`.
- Once the containers are running, open [http://localhost:3000](http://localhost:3000) to use the web frontend.
- Stop the stack with `docker compose down` (keeps the `postgres_data` volume), or run `docker compose down -v` to also delete all data.
