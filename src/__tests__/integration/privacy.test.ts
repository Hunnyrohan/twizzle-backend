import request from "supertest";
import { app } from "../../app";
import User from "../../models/user.model";

describe("Privacy Integration Tests", () => {
    let token: string;
    const testUser = {
        name: "Privacy User",
        username: "privacy_test",
        email: "privacy_test@example.com",
        password: "Password123!",
    };

    beforeAll(async () => {
        await User.deleteOne({ email: testUser.email });
        const regRes = await request(app).post("/api/auth/register").send(testUser);
        token = regRes.body.data.token;
    });

    afterAll(async () => {
        await User.deleteOne({ email: testUser.email });
    });

    it("should update privacy settings", async () => {
        const privacyData = {
            profileVisibility: "private",
            messagePermission: "following"
        };
        const response = await request(app)
            .patch("/api/privacy/me")
            .send(privacyData)
            .set("Authorization", `Bearer ${token}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.profileVisibility).toBe("private");
    });

    it("should update message permissions specifically", async () => {
        const response = await request(app)
            .patch("/api/privacy/me")
            .send({ messagePermission: "nobody" })
            .set("Authorization", `Bearer ${token}`);

        expect(response.status).toBe(200);
        expect(response.body.data.messagePermission).toBe("nobody");
    });

    it("should fetch current user privacy settings", async () => {
        const response = await request(app)
            .get("/api/privacy/me")
            .set("Authorization", `Bearer ${token}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty("profileVisibility");
    });

    it("should return 400 for invalid profileVisibility", async () => {
        const response = await request(app)
            .patch("/api/privacy/me")
            .send({ profileVisibility: "invalid_status" })
            .set("Authorization", `Bearer ${token}`);

        expect(response.status).toBe(400);
    });
});
