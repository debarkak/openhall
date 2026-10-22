import assert from "node:assert/strict";
import { randomBytes, scryptSync } from "node:crypto";
import { execFileSync, spawn } from "node:child_process";
import fs from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "openhall-security-"));
const databaseUrl = `file:${path.join(tempDir, "openhall.db")}`;
const env = {
  ...process.env,
  DATABASE_URL: databaseUrl,
  OPENHALL_UPLOAD_DIR: path.join(tempDir, "uploads"),
  SESSION_SECRET: randomBytes(32).toString("hex"),
  NODE_ENV: "development",
  NEXT_TELEMETRY_DISABLED: "1",
};
const prismaCli = path.join(root, "node_modules", "prisma", "build", "index.js");

function passwordHash(password) {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
}

function getAvailablePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      server.close(() => resolve(address.port));
    });
  });
}

function waitForServerExit(child, timeoutMs = 5000) {
  return Promise.race([
    new Promise((resolve) => child.once("exit", resolve)),
    new Promise((resolve) => setTimeout(resolve, timeoutMs)),
  ]);
}

async function main() {
  if (!fs.existsSync(prismaCli)) {
    throw new Error("dependencies are missing; run npm ci before this check");
  }

  execFileSync(process.execPath, [prismaCli, "db", "push", "--skip-generate"], {
    cwd: root,
    env,
    stdio: "inherit",
  });
  execFileSync(process.execPath, [prismaCli, "generate"], {
    cwd: root,
    env,
    stdio: "inherit",
  });

  // PrismaClient reads datasource settings from the current process, while the
  // CLI and Next server receive the same isolated URL through their env object.
  process.env.DATABASE_URL = databaseUrl;
  process.env.SESSION_SECRET = env.SESSION_SECRET;
  process.env.NODE_ENV = "development";

  const { PrismaClient } = await import("@prisma/client");
  const prisma = new PrismaClient();
  const password = "validation-password-42";
  const suffix = randomBytes(5).toString("hex");
  const teacher = await prisma.user.create({
    data: {
      email: `teacher-${suffix}@openhall.test`,
      name: "Validation Teacher",
      role: "TEACHER",
      passwordHash: passwordHash(password),
    },
  });
  const otherTeacher = await prisma.user.create({
    data: {
      email: `other-teacher-${suffix}@openhall.test`,
      name: "Other Teacher",
      role: "TEACHER",
      passwordHash: passwordHash(password),
    },
  });
  const admin = await prisma.user.create({
    data: {
      email: `admin-${suffix}@openhall.test`,
      name: "Validation Admin",
      role: "ADMIN",
      passwordHash: passwordHash(password),
    },
  });
  const candidate = await prisma.user.create({
    data: {
      email: `candidate-${suffix}@openhall.test`,
      name: "Validation Candidate",
      role: "CANDIDATE",
      passwordHash: passwordHash(password),
    },
  });
  const secondCandidate = await prisma.user.create({
    data: {
      email: `candidate-two-${suffix}@openhall.test`,
      name: "Second Candidate",
      role: "CANDIDATE",
      passwordHash: passwordHash(password),
    },
  });
  const exam = await prisma.exam.create({
    data: {
      title: "security flow validation",
      durationSeconds: 600,
      positiveMarks: 2.5,
      negativePenalty: 0.5,
      navigationPolicy: "FREE_HOPPING",
      isLive: true,
      accessCode: `OH-${suffix.toUpperCase()}`,
      hostId: teacher.id,
      sections: {
        create: {
          title: "mathematics",
          orderIndex: 0,
          questions: {
            create: {
              stem: "what is 2 + 2?",
              orderIndex: 0,
              options: {
                create: [
                  { text: "4", orderIndex: 0, isCorrect: true },
                  { text: "5", orderIndex: 1, isCorrect: false },
                ],
              },
            },
          },
        },
      },
    },
    include: {
      sections: {
        include: {
          questions: {
            include: { options: { orderBy: { orderIndex: "asc" } } },
          },
        },
      },
    },
  });
  const question = exam.sections[0].questions[0];
  const foreignExam = await prisma.exam.create({
    data: {
      title: "other validation exam",
      durationSeconds: 600,
      isLive: true,
      accessCode: `OH-X-${suffix.toUpperCase()}`,
      hostId: teacher.id,
      sections: {
        create: {
          title: "other section",
          questions: {
            create: {
              stem: "foreign question",
              options: { create: [{ text: "foreign option", isCorrect: true }] },
            },
          },
        },
      },
    },
    include: {
      sections: {
        include: {
          questions: {
            include: { options: { orderBy: { orderIndex: "asc" } } },
          },
        },
      },
    },
  });

  const port = await getAvailablePort();
  const origin = `http://127.0.0.1:${port}`;
  const server = spawn(
    process.execPath,
    [path.join(root, "node_modules", "next", "dist", "bin", "next"), "dev", "--hostname", "127.0.0.1", "--port", String(port)],
    { cwd: root, env, stdio: ["ignore", "pipe", "pipe"] }
  );
  let serverOutput = "";
  server.stdout.on("data", (chunk) => { serverOutput += chunk.toString(); });
  server.stderr.on("data", (chunk) => { serverOutput += chunk.toString(); });

  try {
    let ready = false;
    for (let attempt = 0; attempt < 120; attempt++) {
      if (server.exitCode !== null) {
        throw new Error(`development server exited early:\n${serverOutput}`);
      }
      try {
        const response = await fetch(origin);
        if (response.ok) {
          ready = true;
          break;
        }
      } catch {
        // Next.js is still starting.
      }
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
    assert.ok(ready, `development server did not become ready:\n${serverOutput}`);

    async function request(endpoint, options = {}, cookie) {
      const headers = new Headers(options.headers || {});
      if (cookie) headers.set("Cookie", cookie);
      const response = await fetch(`${origin}${endpoint}`, { ...options, headers });
      const contentType = response.headers.get("content-type") || "";
      const data = contentType.includes("application/json") ? await response.json() : null;
      return { response, data };
    }

    async function login(user) {
      const { response } = await request("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: user.email, password }),
      });
      assert.equal(response.status, 200, `login failed for ${user.role}`);
      const cookie = response.headers.get("set-cookie")?.split(";")[0];
      assert.ok(cookie, "login response did not set a session cookie");
      return cookie;
    }

    const teacherCookie = await login(teacher);
    const otherTeacherCookie = await login(otherTeacher);
    const adminCookie = await login(admin);
    const candidateCookie = await login(candidate);
    const secondCandidateCookie = await login(secondCandidate);

    const anonymousLobby = await fetch(`${origin}/lobby`, { redirect: "manual" });
    assert.equal(anonymousLobby.status, 307, "anonymous visitors should be redirected away from the lobby");
    assert.match(anonymousLobby.headers.get("location") || "", /\/login\?redirect=/);

    let result = await request("/api/admin/exams");
    assert.equal(result.response.status, 401, "admin API should reject anonymous requests");
    result = await request("/api/admin/exams", {}, candidateCookie);
    assert.equal(result.response.status, 403, "admin API should reject candidate accounts");
    const uploadImage = async (cookie, bytes = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0])) => {
      const form = new FormData();
      form.append("file", new Blob([bytes], { type: "image/png" }), "diagram.png");
      return request(`/api/admin/exams/${exam.id}/media`, { method: "POST", body: form }, cookie);
    };
    result = await uploadImage();
    assert.equal(result.response.status, 401, "image uploads should reject anonymous requests");
    result = await uploadImage(candidateCookie);
    assert.equal(result.response.status, 403, "image uploads should reject candidate accounts");
    result = await uploadImage(teacherCookie);
    assert.equal(result.response.status, 201, "exam owner should upload a supported image");
    const uploadedImage = await fetch(`${origin}${result.data.url}`);
    assert.equal(uploadedImage.status, 200, "uploaded image should be available through the media route");
    assert.equal(uploadedImage.headers.get("content-type"), "image/png");
    result = await uploadImage(teacherCookie, Buffer.from("not a png"));
    assert.equal(result.response.status, 415, "image uploads should validate file signatures");
    result = await request(`/api/admin/exams/${exam.id}/proctor`, {}, otherTeacherCookie);
    assert.equal(result.response.status, 403, "teachers should not read other teachers' proctor data");
    result = await request(`/api/admin/exams/${exam.id}/proctor`, {}, adminCookie);
    assert.equal(result.response.status, 200, "admins should retain access to all proctor data");
    result = await request("/api/admin/exams", {}, teacherCookie);
    assert.equal(result.response.status, 200);
    assert.ok(result.data.some((item) => item.id === exam.id));
    assert.ok(result.data.every((item) => item.hostId === teacher.id), "teacher exam lists should be owner-scoped");
    result = await request("/api/admin/exams", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "teacher-owned validation exam" }),
    }, teacherCookie);
    assert.equal(result.response.status, 200);
    assert.equal(result.data.hostId, teacher.id, "new exams should belong to the signed-in teacher");
    result = await request(`/api/proctor/${exam.id}/stream`, {}, candidateCookie);
    assert.equal(result.response.status, 403, "proctor stream should reject candidate accounts");
    result = await request(`/api/proctor/${exam.id}/stream`, {}, otherTeacherCookie);
    assert.equal(result.response.status, 403, "proctor stream should reject non-owner teachers");

    result = await request(`/api/admin/exams/${exam.id}/proctor`, {}, teacherCookie);
    assert.equal(result.response.status, 200, "staff should load an empty proctor snapshot");
    assert.deepEqual(result.data.candidates, []);

    const streamController = new AbortController();
    const streamResponse = await fetch(`${origin}/api/proctor/${exam.id}/stream`, {
      headers: { Cookie: teacherCookie },
      signal: streamController.signal,
    });
    assert.equal(streamResponse.status, 200, "staff should connect to proctor stream");
    const streamReader = streamResponse.body.getReader();
    const decoder = new TextDecoder();
    const firstChunk = await streamReader.read();
    assert.match(decoder.decode(firstChunk.value), /CONNECTED/, "proctor stream should send an initial ping");

    result = await request(`/api/exams/${exam.id}/enroll`, { method: "POST" }, candidateCookie);
    assert.equal(result.response.status, 200, "candidate should enroll in a live exam");
    const sessionId = result.data.sessionId;
    assert.equal(result.data.status, "NOT_STARTED", "enrollment must not start the exam timer");
    const liveEvent = await Promise.race([
      streamReader.read(),
      new Promise((_, reject) => setTimeout(() => reject(new Error("proctor event timed out")), 5000)),
    ]);
    assert.match(decoder.decode(liveEvent.value), /CANDIDATE_ENROLLED/, "enrollment should reach live proctors");
    streamController.abort();

    const storedSession = await prisma.examSession.findUnique({ where: { id: sessionId } });
    assert.equal(storedSession.status, "NOT_STARTED");
    assert.equal(storedSession.startedAt, null);
    assert.equal(storedSession.deadline, null);

    result = await request(`/api/admin/questions/${question.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stem: "a mutated question" }),
    }, teacherCookie);
    assert.equal(result.response.status, 409, "question content should lock after enrollment");
    result = await uploadImage(teacherCookie);
    assert.equal(result.response.status, 409, "exam image uploads should lock after enrollment");
    result = await request(`/api/admin/exams/${exam.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "rewritten exam" }),
    }, teacherCookie);
    assert.equal(result.response.status, 409, "exam content should lock after enrollment");
    result = await request(`/api/admin/exams/${exam.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isLive: false }),
    }, teacherCookie);
    assert.equal(result.response.status, 200, "teachers should still be able to unpublish an exam");
    result = await request(`/api/admin/exams/${exam.id}`, { method: "DELETE" }, teacherCookie);
    assert.equal(result.response.status, 409, "candidate history must prevent exam deletion");

    result = await request(`/api/sessions/${sessionId}/manifest?preview=1`, {}, candidateCookie);
    assert.equal(result.response.status, 200, "candidate should preview exam instructions");
    assert.equal(result.data.positiveMarks, 2.5);
    assert.equal(result.data.negativePenalty, 0.5);
    assert.equal("isCorrect" in result.data.sections[0].questions[0].options[0], false, "candidate manifests must not reveal answer keys");
    const previewSession = await prisma.examSession.findUnique({ where: { id: sessionId } });
    assert.equal(previewSession.status, "NOT_STARTED", "instructions preview must not consume exam time");

    result = await request(`/api/sessions/${sessionId}/attempt`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ questionId: question.id, optionId: question.options[0].id, status: "ATTEMPTED_SAVED" }),
    }, candidateCookie);
    assert.equal(result.response.status, 403, "answers should not be accepted before exam start");

    const concurrentStarts = await Promise.all([
      request(`/api/sessions/${sessionId}/manifest`, {}, candidateCookie),
      request(`/api/sessions/${sessionId}/manifest`, {}, candidateCookie),
    ]);
    assert.ok(concurrentStarts.every((start) => start.response.status === 200), "parallel player tabs should both load the same session");
    assert.equal(concurrentStarts[0].data.deadline, concurrentStarts[1].data.deadline, "parallel player tabs should share one server deadline");
    result = concurrentStarts[0];
    const startedSession = await prisma.examSession.findUnique({ where: { id: sessionId } });
    assert.equal(startedSession.status, "IN_PROGRESS");
    assert.ok(startedSession.deadline instanceof Date);

    result = await request(`/api/sessions/${sessionId}/attempt`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ questionId: foreignExam.sections[0].questions[0].id, optionId: question.options[0].id, status: "ATTEMPTED_SAVED" }),
    }, candidateCookie);
    assert.equal(result.response.status, 400, "question IDs from another exam must be rejected");

    result = await request(`/api/sessions/${sessionId}/attempt`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ questionId: question.id, optionId: foreignExam.sections[0].questions[0].options[0].id, status: "ATTEMPTED_SAVED" }),
    }, candidateCookie);
    assert.equal(result.response.status, 400, "option IDs from another question must be rejected");

    result = await request(`/api/sessions/${sessionId}/attempt`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ questionId: question.id, optionId: question.options[0].id, status: "ATTEMPTED_SAVED" }),
    }, secondCandidateCookie);
    assert.equal(result.response.status, 404, "candidates must not mutate another candidate's session");

    result = await request(`/api/sessions/${sessionId}/scorecard`, {}, candidateCookie);
    assert.equal(result.response.status, 403, "answer keys must stay hidden before submission");

    result = await request(`/api/sessions/${sessionId}/telemetry`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventType: "MADE_UP_EVENT", metadata: {} }),
    }, candidateCookie);
    assert.equal(result.response.status, 400, "unknown telemetry event types must be rejected");

    result = await request(`/api/sessions/${sessionId}/telemetry`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventType: "TAB_SWITCH", timestamp: "1999-01-01T00:00:00.000Z" }),
    }, candidateCookie);
    assert.equal(result.response.status, 200, "valid telemetry should be recorded");

    const resumed = await request(`/api/exams/${exam.id}/enroll`, { method: "POST" }, candidateCookie);
    assert.equal(resumed.response.status, 200, "existing candidates should retain their session after unpublish");
    assert.equal(resumed.data.sessionId, sessionId);
    const deniedNewCandidate = await request(`/api/exams/${exam.id}/enroll`, { method: "POST" }, secondCandidateCookie);
    assert.equal(deniedNewCandidate.response.status, 403, "unpublished exams must reject new enrollments");

    result = await request(`/api/sessions/${sessionId}/attempt`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ questionId: question.id, optionId: question.options[0].id, status: "ATTEMPTED_SAVED" }),
    }, candidateCookie);
    assert.equal(result.response.status, 200, "candidate should save a valid answer before submission");

    result = await request(`/api/sessions/${sessionId}/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    }, candidateCookie);
    assert.equal(result.response.status, 200, "candidate should submit the active exam");
    assert.equal(result.data.result.finalScore, 2.5, "score should use the correct answer and configured marks");

    result = await request(`/api/sessions/${sessionId}/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    }, candidateCookie);
    assert.equal(result.response.status, 409, "duplicate submissions must be rejected");

    result = await request(`/api/sessions/${sessionId}/attempt`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ questionId: question.id, optionId: question.options[1].id, status: "ATTEMPTED_SAVED" }),
    }, candidateCookie);
    assert.equal(result.response.status, 403, "finalized sessions must reject answer changes");

    result = await request(`/api/sessions/${sessionId}/manifest`, {}, candidateCookie);
    assert.equal(result.response.status, 403, "finalized sessions must not receive the exam manifest again");

    result = await request(`/api/sessions/${sessionId}/scorecard`, {}, candidateCookie);
    assert.equal(result.response.status, 200, "candidate should receive the scorecard after submission");
    assert.equal(result.data.finalScore, 2.5);

    result = await request(`/api/sessions/${sessionId}/scorecard`, {}, secondCandidateCookie);
    assert.equal(result.response.status, 404, "scorecards must remain private to the owning candidate");

    const foreignQuestion = foreignExam.sections[0].questions[0];
    const foreignEnrollment = await request(`/api/exams/${foreignExam.id}/enroll`, { method: "POST" }, secondCandidateCookie);
    assert.equal(foreignEnrollment.response.status, 200);
    const disqualifiedSessionId = foreignEnrollment.data.sessionId;
    result = await request(`/api/sessions/${disqualifiedSessionId}/manifest`, {}, secondCandidateCookie);
    assert.equal(result.response.status, 200);
    result = await request(`/api/sessions/${disqualifiedSessionId}/attempt`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        questionId: foreignQuestion.id,
        optionId: foreignQuestion.options[0].id,
        status: "ATTEMPTED_SAVED",
      }),
    }, secondCandidateCookie);
    assert.equal(result.response.status, 200);
    result = await request(`/api/sessions/${disqualifiedSessionId}/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ disqualified: true }),
    }, secondCandidateCookie);
    assert.equal(result.response.status, 200);
    assert.equal(result.data.result.finalScore, 0, "disqualified candidates must receive a zero score");
    result = await request(`/api/sessions/${disqualifiedSessionId}/scorecard`, {}, secondCandidateCookie);
    assert.equal(result.response.status, 200);
    assert.equal(result.data.finalScore, 0, "the scorecard must preserve the disqualification score");

    result = await request(`/api/admin/exams/${exam.id}/proctor`, {}, teacherCookie);
    assert.equal(result.response.status, 200);
    assert.equal(result.data.candidates[0].status, "EVALUATED");
    assert.equal(result.data.candidates[0].violationsCount, 1);
    assert.equal(result.data.logs.length, 1);

    result = await request(`/api/admin/exams/${foreignExam.id}/proctor`, {}, teacherCookie);
    assert.equal(result.response.status, 200);
    assert.equal(result.data.candidates[0].status, "DISQUALIFIED");

    console.log(`security and exam-flow checks passed; disposable database: ${databaseUrl}`);
  } finally {
    server.kill("SIGTERM");
    await waitForServerExit(server);
    if (server.exitCode === null) server.kill("SIGKILL");
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
