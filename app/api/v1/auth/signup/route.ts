import { db } from "@/lib/db";
import { createSession } from "@/lib/auth/session";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  displayName: z.string().min(2).max(40)
});

export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const existing = await db.user.findUnique({ where: { email: parsed.data.email.toLowerCase() } });
  if (existing) return NextResponse.json({ error: "EMAIL_ALREADY_EXISTS" }, { status: 409 });

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);
  const user = await db.user.create({
    data: {
      email: parsed.data.email.toLowerCase(),
      displayName: parsed.data.displayName,
      passwordHash
    }
  });

  await createSession(user.id);
  return NextResponse.json({ user: { id: user.id, email: user.email, displayName: user.displayName } });
}
