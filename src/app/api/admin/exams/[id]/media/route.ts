import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { requireExamContentAccess } from "@/lib/authorization";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
const imageTypes = new Map([
  ["image/png", { extension: "png", signature: [137, 80, 78, 71, 13, 10, 26, 10] }],
  ["image/jpeg", { extension: "jpg", signature: [255, 216, 255] }],
  ["image/gif", { extension: "gif", signature: [] }],
  ["image/webp", { extension: "webp", signature: [] }],
]);

function hasValidSignature(type: string, bytes: Uint8Array): boolean {
  const image = imageTypes.get(type);
  if (!image) return false;
  if (type === "image/gif") {
    const header = new TextDecoder().decode(bytes.slice(0, 6));
    return header === "GIF87a" || header === "GIF89a";
  }
  if (type === "image/webp") {
    return bytes.length >= 12 &&
      new TextDecoder().decode(bytes.slice(0, 4)) === "RIFF" &&
      new TextDecoder().decode(bytes.slice(8, 12)) === "WEBP";
  }
  return bytes.length >= image.signature.length &&
    image.signature.every((byte, index) => bytes[index] === byte);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const examId = (await params).id;
  const accessError = await requireExamContentAccess(examId);
  if (accessError) return accessError;

  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > MAX_UPLOAD_BYTES + 64 * 1024) {
    return NextResponse.json({ error: "Image must be 5 MB or smaller." }, { status: 413 });
  }

  try {
    const form = await request.formData();
    const file = form.get("file");
    if (!file || typeof file === "string" || typeof file.arrayBuffer !== "function") {
      return NextResponse.json({ error: "Choose an image file to upload." }, { status: 400 });
    }
    if (file.size === 0 || file.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json({ error: "Image must be between 1 byte and 5 MB." }, { status: 413 });
    }

    const imageType = imageTypes.get(file.type);
    if (!imageType) {
      return NextResponse.json({ error: "Use a PNG, JPEG, GIF, or WebP image." }, { status: 415 });
    }

    const bytes = new Uint8Array(await file.arrayBuffer());
    if (!hasValidSignature(file.type, bytes)) {
      return NextResponse.json({ error: "The uploaded file is not a valid supported image." }, { status: 415 });
    }

    const filename = `${randomUUID()}.${imageType.extension}`;
    const uploadDirectory = process.env.OPENHALL_UPLOAD_DIR || path.join(process.cwd(), "uploads");
    await mkdir(uploadDirectory, { recursive: true });
    await writeFile(path.join(uploadDirectory, filename), bytes, { flag: "wx", mode: 0o644 });

    return NextResponse.json({ url: `/api/media/${filename}` }, { status: 201 });
  } catch (error) {
    console.error("Exam image upload error:", error);
    return NextResponse.json({ error: "Could not upload the image. Try again." }, { status: 400 });
  }
}
