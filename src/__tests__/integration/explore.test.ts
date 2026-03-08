import request from "supertest";
import { app } from "../../app";
import User from "../../models/user.model";

describe("Explore Integration Tests", () => {
    it("should fetch trending posts", async () => {
        const response = await request(app).get("/api/explore/trending");
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
    });

    it("should fetch hot posts", async () => {
        const response = await request(app).get("/api/explore/hot");
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(Array.isArray(response.body.data)).toBe(true);
    });

    it("should fetch follow suggestions", async () => {
        const response = await request(app).get("/api/explore/suggestions");
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
    });

    it("should fetch follow suggestions for authenticated user", async () => {
        // Register a user to get a token
        const testUser = {
            name: "Explore User",
            username: "explore_test",
            email: "explore_test@example.com",
            password: "Password123!",
        };
        await User.deleteOne({ email: testUser.email });
        const regRes = await request(app).post("/api/auth/register").send(testUser);
        const token = regRes.body.data.token;

        const response = await request(app)
            .get("/api/explore/suggestions")
            .set("Authorization", `Bearer ${token}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);

        await User.deleteOne({ email: testUser.email });
    });
});
