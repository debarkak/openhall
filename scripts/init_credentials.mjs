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

  // 1. Teacher Account
  const teacherHash = hashPassword("teacher123");
  const teacher = await prisma.user.upsert({
    where: { email: "teacher@openhall.edu" },
    update: {
      passwordHash: teacherHash,
      role: "TEACHER",
      name: "teacher debarka",
    },
    create: {
      email: "teacher@openhall.edu",
      name: "teacher debarka",
      role: "TEACHER",
      passwordHash: teacherHash,
    },
  });
  console.log(`✅ Teacher Account Configured: ${teacher.email} [Role: ${teacher.role}]`);
  console.log(`   Encrypted Hash stored: ${teacher.passwordHash.slice(0, 24)}... (Salt + 64-byte scrypt key)`);

  // 2. Student Account
  const studentHash = hashPassword("student123");
  const student = await prisma.user.upsert({
    where: { email: "student@openhall.edu" },
    update: {
      passwordHash: studentHash,
      role: "CANDIDATE",
      name: "student debarka",
    },
    create: {
      email: "student@openhall.edu",
      name: "student debarka",
      role: "CANDIDATE",
      passwordHash: studentHash,
    },
  });
  console.log(`✅ Student Account Configured: ${student.email} [Role: ${student.role}]`);
  console.log(`   Encrypted Hash stored: ${student.passwordHash.slice(0, 24)}... (Salt + 64-byte scrypt key)`);

  // 3. Update existing debarkak@murena.io with default password hash as well
  await prisma.user.updateMany({
    where: { email: "debarkak@murena.io" },
    data: { passwordHash: studentHash },
  });

  console.log("🔒 Credentials encryption initialization complete.");
  await prisma.$disconnect();
}

initCredentials().catch((e) => {
  console.error(e);
  process.exit(1);
});
