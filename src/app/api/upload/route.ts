import type { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/db/supabase-admin";
import { parseSessionToken, verifyClerkSession } from "@/lib/auth/getSessionUser";
import { validateCsrfOrigin } from "@/lib/csrf";

const BUCKET = "HOSTME";
const MAX_BYTES = 10 * 1024 * 1024; // 10MB

const IMAGE_EXTENSIONS = ["jpg", "jpeg", "png", "webp", "gif"];
const DOCUMENT_EXTENSIONS = ["pdf"];

function sniffImageType(bytes: Uint8Array): string | null {
  if (bytes.length < 12) return null;
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "jpeg";
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return "png";
  if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) return "gif";
  if (bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) return "webp";
  return null;
}

function sniffPdfType(bytes: Uint8Array): boolean {
  if (bytes.length < 5) return false;
  const header = String.fromCharCode(
    bytes[0] as number,
    bytes[1] as number,
    bytes[2] as number,
    bytes[3] as number,
    bytes[4] as number
  );
  return header === "%PDF-";
}

export async function POST(request: NextRequest) {
  try {
    const csrfFail = validateCsrfOrigin(request);
    if (csrfFail) return csrfFail;

    const sessionInfo = await parseSessionToken(request);
    if (!sessionInfo?.userId) {
      return Response.json({ error: "Authentication required" }, { status: 401 });
    }
    const isValid = await verifyClerkSession(sessionInfo.sessionId, sessionInfo.userId);
    if (!isValid) {
      return Response.json({ error: "Authentication required" }, { status: 401 });
    }

    if (!supabaseAdmin) {
      return Response.json(
        { error: "Storage not configured — add SUPABASE_SERVICE_ROLE_KEY to env" },
        { status: 500 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const purpose = (formData.get("purpose") as string | null) || "listing"; // "listing" | "verification"

    if (!file || !file.size) {
      return Response.json({ error: "No file provided" }, { status: 400 });
    }

    if (file.size > MAX_BYTES) {
      return Response.json({ error: "File is too large. Max size is 10MB." }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const uint8 = new Uint8Array(bytes);

    let ext;
    let contentType;
    let folder;

    if (purpose === "verification") {
      // Verification documents: images or PDFs
      const imageType = sniffImageType(uint8);
      const isPdf = sniffPdfType(uint8);

      if (imageType) {
        ext = imageType;
        contentType = `image/${ext}`;
        folder = "verification-docs";
      } else if (isPdf) {
        ext = "pdf";
        contentType = "application/pdf";
        folder = "verification-docs";
      } else {
        return Response.json(
          { error: "File must be an image (JPG, PNG, WebP) or PDF" },
          { status: 400 }
        );
      }
    } else {
      // Listing images only
      const detected = sniffImageType(uint8);
      if (!detected) {
        return Response.json({ error: "File is not a valid image" }, { status: 400 });
      }
      ext = detected;
      contentType = `image/${ext}`;
      folder = "listings";
    }

    const uniqueName = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

    let bucketExists = true;

    const { data, error } = await supabaseAdmin.storage
      .from(BUCKET)
      .upload(uniqueName, Buffer.from(bytes), {
        contentType,
        upsert: false,
      });

    if (error) {
      const errMsg = ((error as unknown as { message?: string }).message || (error as unknown as { error?: string }).error || "").toLowerCase();
      const isBucketProblem = errMsg.includes("bucket") || errMsg.includes("not found") || errMsg.includes("does not exist");

      if (isBucketProblem) {
        bucketExists = false;
        const { error: createErr } = await supabaseAdmin.storage.createBucket(BUCKET, {
          public: true,
        });
        if (createErr) {
          return Response.json({
            error: `Failed to create storage bucket. Create one manually: Supabase Dashboard → Storage → New bucket → name: "${BUCKET}", Public: ON`,
          }, { status: 500 });
        }
      } else {
        return Response.json({ error: `Upload error: ${error.message || "Unknown"}` }, { status: 500 });
      }
    }

    if (!bucketExists) {
      const { data: retryData, error: retryErr } = await supabaseAdmin.storage
        .from(BUCKET)
        .upload(uniqueName, Buffer.from(bytes), { contentType });
      if (retryErr) {
        return Response.json({ error: "Upload failed after creating bucket" }, { status: 500 });
      }
      const url = supabaseAdmin.storage.from(BUCKET).getPublicUrl(retryData.path).data.publicUrl;
      return Response.json({ url, purpose });
    }

    const url = supabaseAdmin.storage.from(BUCKET).getPublicUrl((data as { path: string }).path).data.publicUrl;
    return Response.json({ url, purpose });
  } catch (error) {
    console.error("POST /api/upload error:", error);
    return Response.json({ error: "Upload failed" }, { status: 500 });
  }
}
