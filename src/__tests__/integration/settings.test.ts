import request from "supertest";
import { app } from "../../app";
import User from "../../models/user.model";

describe("Settings Integration Tests", () => {
    let token: string;
    const testUser = {
        name: "Settings User",
        username: "settings_test",
        email: "settings_test@example.com",
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

    it("should fetch user settings", async () => {
        const response = await request(app)
            .get("/api/settings/me")
            .set("Authorization", `Bearer ${token}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty("theme");
    });

    it("should update user settings", async () => {
        const updateData = { theme: "dark" };
        const response = await request(app)
            .patch("/api/settings/me")
            .send(updateData)
            .set("Authorization", `Bearer ${token}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.theme).toBe("dark");
    });

    it("should update theme to light", async () => {
        const response = await request(app)
            .patch("/api/settings/me")
            .send({ theme: "light" })
            .set("Authorization", `Bearer ${token}`);

        expect(response.status).toBe(200);
        expect(response.body.data.theme).toBe("light");
    });

    it("should update language", async () => {
        const response = await request(app)
            .patch("/api/settings/me")
            .send({ language: "en" })
            .set("Authorization", `Bearer ${token}`);

        expect(response.status).toBe(200);
    });
});
