import { PrismaClient } from "@prisma/client";
import { decryptField, decryptJson, emailIndex, encryptField, encryptJson, phoneIndex } from "@/lib/crypto/fields";

/** Guest columns stored encrypted (lib/crypto/fields.ts); emailHash/phoneHash find them by exact value. */
const GUEST_ENCRYPTED = ["email", "phone", "idNumber", "notes"] as const;

type Data = Record<string, unknown>;
const plain = (v: unknown) => (v && typeof v === "object" && "set" in v ? (v as { set: unknown }).set : v);

function guestData(data: Data | undefined) {
  if (!data) return data;
  const out: Data = { ...data };
  for (const f of GUEST_ENCRYPTED) {
    if (!(f in out)) continue;
    const v = plain(out[f]);
    if (typeof v === "string" || v === null) out[f] = encryptField(v);
  }
  if (plain(data.email) !== undefined) out.emailHash = emailIndex(plain(data.email) as string | null);
  if (plain(data.phone) !== undefined) out.phoneHash = phoneIndex(plain(data.phone) as string | null);
  return out;
}

function reservationData(data: Data | undefined) {
  if (!data || !("platformDetails" in data)) return data;
  return { ...data, platformDetails: encryptJson(plain(data.platformDetails)) };
}

type WriteArgs = { data?: Data | Data[]; create?: Data; update?: Data };
function mapWrite(args: WriteArgs, fn: (d: Data | undefined) => Data | undefined) {
  const out = { ...args };
  if (Array.isArray(out.data)) out.data = out.data.map((d) => fn(d)!);
  else if (out.data) out.data = fn(out.data);
  if (out.create) out.create = fn(out.create);
  if (out.update) out.update = fn(out.update);
  return out;
}

function createClient() {
  const base = new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : process.env.NODE_ENV === "test" ? [] : ["error"],
  });
  const writes = ["create", "createMany", "createManyAndReturn", "update", "updateMany", "updateManyAndReturn", "upsert"] as const;
  const hooks = (fn: (d: Data | undefined) => Data | undefined) =>
    Object.fromEntries(writes.map((op) => [op, ({ args, query }: { args: WriteArgs; query: (a: WriteArgs) => Promise<unknown> }) => query(mapWrite(args, fn))]));
  const extended = base.$extends({
    query: { guest: hooks(guestData), reservation: hooks(reservationData) },
    result: {
      guest: {
        email: { needs: { email: true }, compute: (g) => decryptField(g.email) },
        phone: { needs: { phone: true }, compute: (g) => decryptField(g.phone) },
        idNumber: { needs: { idNumber: true }, compute: (g) => decryptField(g.idNumber) },
        notes: { needs: { notes: true }, compute: (g) => decryptField(g.notes) },
      },
      reservation: { platformDetails: { needs: { platformDetails: true }, compute: (r: { platformDetails: unknown }) => decryptJson(r.platformDetails) } },
    },
  });
  // The extension only changes how values are stored, not their types.
  return extended as unknown as PrismaClient;
}

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const db = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
