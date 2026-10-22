# openhall

openhall is a self-hosted app for writing, taking, and reviewing timed exams. teachers manage papers in the browser, candidates take them from the lobby, and proctors can follow session activity.

the project is still being built. it is useful to run and try, but browser checks are not a replacement for an in-person invigilator or a locked-down device.

## what it can do

- create exams, sections, and multiple-choice questions
- write questions and explanations with LaTeX, and attach diagrams
- upload question images to local storage
- set exam duration, answer marks, penalties, and whether an exam is live
- save answers while a candidate works, including a local queue during a network interruption
- grade submitted exams on the server and show a results report
- record browser focus and fullscreen events for the proctor screen
- run on one server with SQLite or in the included Docker setup

## current limits

- integrity checks record browser events such as tab visibility, focus, and fullscreen changes. openhall does not use a webcam, identify faces, or prevent someone from using another device.
- live proctor updates use an in-memory event stream. run one app process for a class; multiple replicas need a shared event service before they can share live updates.
- SQLite is the database configured by the current Prisma schema. PostgreSQL setup is not supported yet.
- uploaded images are stored on the app host. back up the uploads directory along with the database.
- the browser can keep answers queued while offline, but candidates need to reconnect and let the queue sync before submitting.

## run it locally

### you need

- Node.js 22.12 or newer
- npm

### install and start

```sh
git clone https://github.com/debarkak/openhall.git
cd openhall
npm ci
cp .env.example .env
npx prisma db push
npm run seed
npm run init:credentials
npm run dev
```

open [http://localhost:3000](http://localhost:3000).

the seed creates a 45-question sample exam with access code `OH-MOCK-09`. it is safe to run again only while that sample exam has no candidate sessions. reseeding replaces the sample exam's sections and questions. it does not reset the rest of the database.

in development, the credential script uses `teacher123` and `student123` if you have not set `INITIAL_TEACHER_PASSWORD` and `INITIAL_STUDENT_PASSWORD` in `.env`.

| account | email | development password |
|---|---|---|
| teacher | `teacher@openhall.edu` | `teacher123` |
| candidate | `student@openhall.edu` | `student123` |

these defaults are for local development only. use unique passwords before anyone else can reach the app.

### configuration

`.env.example` contains the available settings:

| setting | purpose |
|---|---|
| `DATABASE_URL` | SQLite database path; defaults to `file:./openhall.db` |
| `SESSION_SECRET` | signs session cookies; production requires at least 32 characters |
| `INITIAL_TEACHER_PASSWORD` | password set by the one-time credential script |
| `INITIAL_STUDENT_PASSWORD` | password set by the one-time credential script |
| `OPENHALL_UPLOAD_DIR` | image upload directory; defaults to `./uploads` |
| `PORT` | web server port; defaults to `3000` |

the credential script changes the two account passwords each time it runs. run it once for a new database, or again only when you intend to reset those passwords.

## run with Docker

Docker Compose keeps the SQLite database and uploaded images in separate named volumes. create a `.env` file and set real values for `SESSION_SECRET`, `INITIAL_TEACHER_PASSWORD`, and `INITIAL_STUDENT_PASSWORD` before starting the container. Use a session secret of at least 32 characters and passwords of at least 12 characters. Generate a session secret with:

```sh
openssl rand -base64 48
```

Then start the app and initialize its database and accounts:

```sh
docker compose up -d --build
docker compose exec --user root openhall node node_modules/prisma/build/index.js db push --skip-generate
docker compose exec --user root openhall node scripts/init_credentials.mjs
docker compose exec --user root openhall chown -R nextjs:nodejs /app/prisma /app/uploads
```

the setup commands run as root so they can create the database and read the one-time setup script. they hand the data directories back to `nextjs`; the app itself runs as that unprivileged user.

open [http://localhost:3000](http://localhost:3000). The Docker image starts with an empty database; create an exam from the teacher studio or seed a sample database during local development.

To stop the app while keeping its data, run `docker compose down`. The named volumes remain. `docker compose down -v` removes those volumes and permanently deletes the database and uploaded images.

## checks

Run the checks that do not need a browser:

```sh
npm run lint
npx tsc --noEmit
npm run test:security
npm run build
```

`npm run test:security` creates a temporary SQLite database and starts a local Next.js server to check login, access control, exam attempts, scoring, and image uploads. It does not use your development database.

## stack

- Next.js App Router and TypeScript
- React and Tailwind CSS
- Prisma with SQLite
- KaTeX for math notation
- IndexedDB for the candidate answer queue

## license

OpenHall is licensed under the MIT License. See [LICENSE](LICENSE).
