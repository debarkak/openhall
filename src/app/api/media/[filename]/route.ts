import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const mediaTypes: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
};

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  const { filename } = await params;
  const match = /^([0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})\.(png|jpg|gif|webp)$/i.exec(filename);
  if (!match) return NextResponse.json({ error: "Image not found." }, { status: 404 });

  const uploadDirectory = process.env.OPENHALL_UPLOAD_DIR || path.join(process.cwd(), "uploads");
  try {
    const image = await readFile(path.join(uploadDirectory, filename));
    return new NextResponse(image, {
      headers: {
        "Content-Type": mediaTypes[match[2].toLowerCase()],
        "Content-Length": String(image.byteLength),
        "Cache-Control": "public, max-age=31536000, immutable",
        "Content-Disposition": "inline",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return NextResponse.json({ error: "Image not found." }, { status: 404 });
  }
}
