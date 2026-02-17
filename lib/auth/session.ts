import { cookies } from "next/headers";
import { createHash, randomBytes } from "node:crypto";
import { db } from "@/lib/db";

const COOKIE_NAME = "brainbolt_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7;

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

export const createSession = async (userId: string) => {
  const token = randomBytes(32).toString("hex");
  await db.session.create({
    data: {
      userId,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + SESSION_TTL_MS)
    }
  });
  cookies().set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_MS / 1000
  });
};

export const requireUser = async () => {
  const token = cookies().get(COOKIE_NAME)?.value;
  if (!token) return null;

  const session = await db.session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: true }
  });

  if (!session) return null;
  if (session.expiresAt.getTime() <= Date.now()) {
    await db.session.delete({ where: { id: session.id } });
    cookies().delete(COOKIE_NAME);
    return null;
  }

  return session.user;
};

export const clearSession = async () => {
  const token = cookies().get(COOKIE_NAME)?.value;
  if (token) {
    await db.session.deleteMany({ where: { tokenHash: hashToken(token) } });
  }
  cookies().delete(COOKIE_NAME);
};
