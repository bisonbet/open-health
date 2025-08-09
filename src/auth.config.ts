import {NextAuthConfig} from "next-auth";

export const authConfig = {
    session: {
        strategy: 'jwt',
    },
    pages: {
        signIn: '/login',
    },
    callbacks: {
        session: async ({session, token}) => {
            if (token.sub && session.user) session.user.id = token.sub;
            return session;
        },
    },
    providers: [],
    // Specify that this should run in Node.js runtime, not Edge
    trustHost: true,
} satisfies NextAuthConfig;

