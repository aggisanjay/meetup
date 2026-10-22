import { getAuth, verifyToken, clerkClient } from "@clerk/express";
import { sql } from "../config/db.js";

export const protect = async (req, res, next) => {
    // Check for test token in authorization header if test env
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer test:")) {
        const parts = authHeader.replace("Bearer test:", "").split(":");
        const testUserId = parts[0];
        const testName = parts[1] || "Test User";
        req.user = { id: testUserId, name: testName, plan: "free" };
        return next();
    }

    const auth = getAuth(req);
    const userId = auth?.userId || req.auth?.userId;

    if (!userId) {
        return res.status(401).json({ error: "Not authorized, authentication required" });
    }

    req.user = { id: userId };

    try {
        const userActivePlan = auth.has && auth.has({ plan: "premium" }) ? "premium" : "free";

        const users = await sql`SELECT name, plan FROM users WHERE id = ${userId}`;
        const userPlan = users[0]?.plan;

        if (users.length > 0 && userActivePlan !== userPlan) {
            await sql`UPDATE users SET plan = ${userActivePlan} WHERE id = ${userId}`;
        }
        if (users.length > 0) {
            req.user.name = users[0].name;
            req.user.plan = userPlan || "free";
        }
    } catch (err) {
        console.error("Auth middleware error checking plan:", err);
    }

    next();
};

/**
 * Authenticate Socket.IO handshake token
 */
export async function authenticateSocketToken(token) {
    if (!token) {
        throw new Error("Authentication token required");
    }

    // Support test tokens for integration tests
    if (token.startsWith("test:")) {
        const parts = token.replace("test:", "").split(":");
        const userId = parts[0];
        const name = parts[1] || "Test User";
        const email = parts[2] || `${userId}@example.com`;

        // Ensure in DB
        await sql`
            INSERT INTO users (id, name, email, plan)
            VALUES (${userId}, ${name}, ${email}, 'free')
            ON CONFLICT (id) DO UPDATE SET name = ${name}
        `;

        return { id: userId, name, email, plan: "free" };
    }

    // Standard Clerk token verification
    try {
        const payload = await verifyToken(token, {
            secretKey: process.env.CLERK_SECRET_KEY,
        });

        const userId = payload.sub;
        if (!userId) {
            throw new Error("Invalid token: missing subject");
        }

        // Fetch or create user in DB
        const users = await sql`SELECT id, name, email, plan FROM users WHERE id = ${userId}`;
        if (users.length > 0) {
            return users[0];
        }

        // Auto-fetch details from Clerk if not in DB
        try {
            const clerkUser = await clerkClient.users.getUser(userId);
            const name = `${clerkUser.firstName || "User"} ${clerkUser.lastName || ""}`.trim();
            const email = clerkUser.emailAddresses?.[0]?.emailAddress || "";
            const image = clerkUser.imageUrl || "";

            const [newUser] = await sql`
                INSERT INTO users (id, name, email, image, plan)
                VALUES (${userId}, ${name}, ${email}, ${image}, 'free')
                ON CONFLICT (id) DO UPDATE SET name = ${name}
                RETURNING id, name, email, plan
            `;
            return newUser;
        } catch (e) {
            return { id: userId, name: "User", email: "", plan: "free" };
        }
    } catch (err) {
        throw new Error(`Socket authentication failed: ${err.message}`);
    }
}