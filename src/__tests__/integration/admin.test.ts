import request from "supertest";
import { app } from "../../app";
import User from "../../models/user.model";

describe("Admin Integration Tests", () => {
    let adminToken: string;
    let adminId: string;

    const adminUser = {
        name: "Admin User",
        username: "admin_test",
        email: "admin_test@example.com",
        password: "AdminPassword123!",
    };

    beforeAll(async () => {
        await User.deleteOne({ email: adminUser.email });
        await request(app).post("/api/auth/register").send(adminUser);

        // Manually make the user an admin in the database
        await User.findOneAndUpdate({ email: adminUser.email }, { role: 'admin' });

        const login = await request(app).post("/api/auth/login").send({
            identifier: adminUser.email,
            password: adminUser.password
        });
        adminToken = login.body.data.token;
        adminId = login.body.data.user._id;
    });

    afterAll(async () => {
        await User.deleteOne({ _id: adminId });
    });

    describe("GET /api/admin/stats", () => {
        it("should fetch system statistics", async () => {
            const response = await request(app)
                .get("/api/admin/stats")
                .set("Authorization", `Bearer ${adminToken}`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveProperty("usersCount");
            expect(response.body.data).toHaveProperty("tweetsCount");
        });

        it("should return 403 for non-admin users", async () => {
            // Create a regular user
            const regUser = {
                name: "Regular User",
                username: "regular_test",
                email: "regular_test@example.com",
                password: "Password123!"
            };
            await User.deleteOne({ email: regUser.email });
            await request(app).post("/api/auth/register").send(regUser);
            const login = await request(app).post("/api/auth/login").send({
                identifier: regUser.email,
                password: regUser.password
            });
            const regToken = login.body.data.token;

            const response = await request(app)
                .get("/api/admin/stats")
                .set("Authorization", `Bearer ${regToken}`);

            expect(response.status).toBe(403);

            await User.deleteOne({ email: regUser.email });
        });
    });

    describe("GET /api/admin/users", () => {
        it("should fetch all users for admin", async () => {
            const response = await request(app)
                .get("/api/admin/users")
                .set("Authorization", `Bearer ${adminToken}`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(Array.isArray(response.body.data.users)).toBe(true);
        });
    });
});
