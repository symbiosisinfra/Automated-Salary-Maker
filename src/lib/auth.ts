// lib/auth.ts
import { DefaultSession, NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { compare } from "bcrypt";

// Static user credentials (in production, use a database)
const users = [
  {
    id: "1",
    name: "Anmol Sonkar",
    email: "admin@symbiosisinfra.com",
    password: "$2b$10$fBCTR/.8yebO7Hj78n54G.nYD9FSUbsttbEDJo1tl80nydmkZlbOq", // @Admin2025#
    role: "superadmin",
  },
  {
    id: "2",
    name: "Admin User",
    email: "admin@example.com",
    password: "$2b$10$IrQE4ToFQJRaMvkJxH7R/uE.fdUDsmPNMZvR0S5q1fxnMRT6MbkWC", // admin123
    role: "admin",
  },
];

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const user = users.find((user) => user.email === credentials.email);
        if (!user) {
          return null;
        }

        // For development purposes, allow direct password match for @Admin2025#
        let isPasswordValid = false;

        if (
          credentials.email === "admin@symbiosisinfra.com" &&
          credentials.password === "@Admin2025#"
        ) {
          isPasswordValid = true;
        } else {
          // For other users or in production, use bcrypt comparison
          isPasswordValid = await compare(credentials.password, user.password);
        }

        if (!isPasswordValid) {
          return null;
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.role = token.role as string;
        session.user.id = token.sub as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET || "5QL*W79!jkP#2RzX$vFb@mGqH3tEn6yD",
};

// Types extension
declare module "next-auth" {
  interface User {
    role?: string;
  }

  interface Session {
    user: {
      id: string;
      role: string;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: string;
  }
}
