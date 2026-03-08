import request from "supertest";
import { app } from "../../app";
import User from "../../models/user.model";
import mongoose from "mongoose";

describe("Block Integration Tests", () => {
    let token: string;
    let userId: string;
    let targetUserId: string;

    const testUser = {
        name: "Blocker User",
        username: "blocker_test",
        email: "blocker_test@example.com",
        password: "Password123!",
    };

    const targetUser = {
        name: "Blocked User",
        username: "blocked_test",
        email: "blocked_test@example.com",
        password: "Password123!",
    };

    beforeAll(async () => {
        // Clear and create users
        await User.deleteMany({ email: { $in: [testUser.email, targetUser.email] } });

        const regRes = await request(app).post("/api/auth/register").send(testUser);
        token = regRes.body.data.token;
        userId = regRes.body.data.user.id;

        const targetRes = await request(app).post("/api/auth/register").send(targetUser);
        targetUserId = targetRes.body.data.user.id;
    });

    afterAll(async () => {
        await User.deleteMany({ email: { $in: [testUser.email, targetUser.email] } });
    });

    it("should block a user", async () => {
        const response = await request(app)
            .post(`/api/blocks/${targetUserId}`)
            .set("Authorization", `Bearer ${token}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.message).toBe("User blocked");
    });

    it("should show blocked user in blocks list", async () => {
        const response = await request(app)
            .get("/api/blocks")
            .set("Authorization", `Bearer ${token}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(Array.isArray(response.body.data)).toBe(true);
        expect(response.body.data.some((u: any) => u._id === targetUserId)).toBe(true);
    });

    it("should unblock a user", async () => {
        const response = await request(app)
            .post(`/api/blocks/${targetUserId}`)
            .set("Authorization", `Bearer ${token}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.message).toBe("User unblocked");
    });

    it("should not show unblocked user in blocks list", async () => {
        const response = await request(app)
            .get("/api/blocks")
            .set("Authorization", `Bearer ${token}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.some((u: any) => u._id === targetUserId)).toBe(false);
    });

    it("should return 404 for blocking non-existent user", async () => {
        const fakeId = new mongoose.Types.ObjectId();
        const response = await request(app)
            .post(`/api/blocks/${fakeId}`)
            .set("Authorization", `Bearer ${token}`);

        expect(response.status).toBe(404);
        expect(response.body.success).toBe(false);
    });
});
