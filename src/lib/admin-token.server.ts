import { createHmac, timingSafeEqual } from "node:crypto";

const TOKEN_TTL_SECONDS = 60 * 60; // 1 hour

function getSecret() {
  const s = process.env.ADMIN_PASSWORD;
  if (!s) throw new Error("Servidor sem senha configurada.");
  return s;
}

function sign(payload: string) {
  return createHmac("sha256", getSecret()).update(payload).digest("hex");
}

export function issueToken() {
  const exp = Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS;
  const payload = `v1.${exp}`;
  return { token: `${payload}.${sign(payload)}`, expiresIn: TOKEN_TTL_SECONDS };
}

export function verifyToken(token: string) {
  const parts = token.split(".");
  if (parts.length !== 3 || parts[0] !== "v1") throw new Error("Sessão inválida.");
  const exp = Number(parts[1]);
  if (!Number.isFinite(exp) || exp * 1000 < Date.now()) throw new Error("Sessão expirada.");
  const expected = sign(`v1.${parts[1]}`);
  const a = Buffer.from(parts[2], "hex");
  const b = Buffer.from(expected, "hex");
  if (a.length !== b.length || !timingSafeEqual(a, b)) throw new Error("Sessão inválida.");
}

export function verifyPassword(password: string) {
  const expected = getSecret();
  const a = Buffer.from(password);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) throw new Error("Senha incorreta.");
}
