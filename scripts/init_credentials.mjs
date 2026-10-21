import { PrismaClient } from "@prisma/client";
import crypto from "crypto";

const prisma = new PrismaClient();

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const derivedKey = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${derivedKey}`;
}

async function initCredentials() {
  console.log("🔐 Initializing encrypted credentials in OpenHall database...");

  const teacherPassword = process.env.INITIAL_TEACHER_PASSWORD || "teacher123";
  const studentPassword = process.env.INITIAL_STUDENT_PASSWORD || "student123";

  // 1. Teacher Account
  const teacherHash = hashPassword(teacherPassword);
  const teacher = await prisma.user.upsert({
    where: { email: "teacher@openhall.edu" },
    update: {
      passwordHash: teacherHash,
      role: "TEACHER",
      name: "teacher",
    },
    create: {
      email: "teacher@openhall.edu",
      name: "teacher",
      role: "TEACHER",
      passwordHash: teacherHash,
    },
  });
  console.log(`✅ Teacher Account Configured: ${teacher.email} [Role: ${teacher.role}]`);

  // 2. Student Account
  const studentHash = hashPassword(studentPassword);
  const student = await prisma.user.upsert({
    where: { email: "student@openhall.edu" },
    update: {
      passwordHash: studentHash,
      role: "CANDIDATE",
      name: "student",
    },
    create: {
      email: "student@openhall.edu",
      name: "student",
      role: "CANDIDATE",
      passwordHash: studentHash,
    },
  });
  console.log(`✅ Student Account Configured: ${student.email} [Role: ${student.role}]`);

  console.log("🔒 Credentials encryption initialization complete.");
  await prisma.$disconnect();
}

initCredentials().catch((e) => {
  console.error(e);
  process.exit(1);
});
