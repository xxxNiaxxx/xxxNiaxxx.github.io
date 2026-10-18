import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";
import { SecondStepError, verifyCredentials } from "./token";

const credentialsSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
  code: z.string().trim().max(20).optional(),
});

/** The login form reads `code` ("totp" / "totp-invalid") to ask for the two-step code. */
class SecondStepSignin extends CredentialsSignin {
  constructor(step: string) {
    super();
    this.code = step;
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  trustHost: true,
  providers: [
    Credentials({
      credentials: { email: {}, password: {}, code: {} },
      async authorize(raw) {
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) return null;
        try {
          return await verifyCredentials(parsed.data.email, parsed.data.password, { code: parsed.data.code, client: "web" });
        } catch (e) {
          if (e instanceof SecondStepError) throw new SecondStepSignin(e.step);
          throw e;
        }
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user?.id) {
        token.sub = user.id;
        token.sv = (user as { sessionVersion?: number }).sessionVersion ?? 0;
      }
      return token;
    },
    session({ session, token }) {
      if (token.sub) session.user.id = token.sub;
      (session as { sessionVersion?: number }).sessionVersion = typeof token.sv === "number" ? token.sv : 0;
      return session;
    },
  },
});
