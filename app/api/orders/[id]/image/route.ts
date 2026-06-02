import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getTransaction } from "@/lib/transactions";
import { setOrderImage, clearOrderImage } from "@/lib/orders";
import {
  getAccessToken,
  ensureFolder,
  uploadImage,
  downloadImage,
  deleteImage,
} from "@/lib/google";

async function requireUser(supabase: ReturnType<typeof createClient>) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient();
  if (!(await requireUser(supabase)))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File))
    return NextResponse.json({ error: "No file" }, { status: 400 });
  if (file.type && file.type !== "application/pdf")
    return NextResponse.json({ error: "Only PDF files allowed" }, { status: 400 });

  try {
    const token = await getAccessToken(supabase);
    const folderId = await ensureFolder(supabase, token);
    const driveId = await uploadImage(token, folderId, file);
    await setOrderImage(supabase, params.id, {
      image_drive_id: driveId,
      image_name: file.name,
    });
    return NextResponse.json({ image_drive_id: driveId, image_name: file.name });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Upload failed" },
      { status: 500 }
    );
  }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient();
  if (!(await requireUser(supabase)))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const txn = await getTransaction(supabase, params.id);
  if (!txn?.image_drive_id)
    return NextResponse.json({ error: "No image" }, { status: 404 });

  try {
    const token = await getAccessToken(supabase);
    const driveRes = await downloadImage(token, txn.image_drive_id);
    const headers = new Headers();
    headers.set(
      "Content-Type",
      driveRes.headers.get("Content-Type") ?? "application/pdf"
    );
    // inline => the browser previews the PDF instead of downloading it.
    headers.set(
      "Content-Disposition",
      `inline; filename="${txn.image_name ?? "file.pdf"}"`
    );
    return new NextResponse(driveRes.body, { headers });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Download failed" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient();
  if (!(await requireUser(supabase)))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const txn = await getTransaction(supabase, params.id);
  try {
    if (txn?.image_drive_id) {
      const token = await getAccessToken(supabase);
      await deleteImage(token, txn.image_drive_id);
    }
    await clearOrderImage(supabase, params.id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Delete failed" },
      { status: 500 }
    );
  }
}
