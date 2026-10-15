# Forge sandbox verification (backend and database)

This note records which backend checks were run in the Forge sandbox, which could not run, and how to run the database checks locally and in CI.

## Verified in the sandbox

| Check | Command | Result |
|-------|---------|--------|
| Install API deps | `cd src/api && npm ci` | Passed |
| Install migration deps | `cd src/db && npm ci` | Passed |
| API syntax | `cd src/api && node --check index.js && node --check db.js` | Passed |
| Migration exports | Load each file in `src/db/migrations/` and confirm `up` and `down` are functions | Passed (2 migrations) |

## Not verified in the sandbox

| Check | Command | Result |
|-------|---------|--------|
| Apply migrations to PostgreSQL | `cd src/db && DATABASE_URL=postgres://app:app@localhost:5432/app npm run migrate` | **Not run.** Failed with `ECONNREFUSED 127.0.0.1:5432`. The sandbox has no PostgreSQL server. |
| API against a real database | `docker compose up --build` | **Not run.** The sandbox has no Docker daemon. |

Database checks must not be reported as passed unless they ran against a real PostgreSQL 17 instance.

## Running the DB checks locally

Requires Docker, or a local PostgreSQL 17 server.

```bash
# Option A: full stack (postgres, migrate, api, web)
docker compose up --build

# Option B: apply migrations to a local PostgreSQL 17
cd src/db
npm ci
DATABASE_URL=postgres://app:app@localhost:5432/app npm run migrate

# Roll back the last migration
DATABASE_URL=postgres://app:app@localhost:5432/app npm run migrate:down
```

Local credentials come from `docker-compose.yml`. Do not commit a `.env` file.

## CI

CI is the place for real-database checks. The job should:

1. Start a PostgreSQL 17 service.
2. Run `npm ci` in `src/db`, then `npm run migrate` with `DATABASE_URL` pointing at the service.
3. Run `npm ci` in `src/api`, start the API, and check `GET /health`, `GET /tasks`, `POST /tasks` and `PATCH /tasks/:id`.

The backend has no automated test runner yet. The `test` scripts in `src/api` and `src/db` are placeholders that exit 1, so they are not a DB check.

## Limits of the sandbox

See the wiki page "Postgres sandbox workaround" for the exact error and the safe workaround.

## Wiki reference

The project wiki page "Postgres sandbox workaround" records the exact `ECONNREFUSED 127.0.0.1:5432` symptom, the command that reproduces it, and the safe workaround. The database checks in this note remain NOT RUN until they are executed against a real PostgreSQL 17 instance in CI or locally.
