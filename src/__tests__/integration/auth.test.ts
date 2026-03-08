import request from "supertest";
import { app } from "../../app";
import User from "../../models/user.model";

describe("Authentication Integration Tests", () => {
    const testUser = {
        name: "Test User",
        username: "testuser_test",
        email: "testuser_test@example.com",
        password: "Password123!",
    };

    beforeAll(async () => {
        await User.deleteOne({ email: testUser.email });
        await User.deleteOne({ username: testUser.username });
    });

    afterAll(async () => {
        await User.deleteOne({ email: testUser.email });
        await User.deleteOne({ username: testUser.username });
    });

    describe("POST /api/auth/register", () => {
        it("should register a new user successfully", async () => {
            const response = await request(app)
                .post("/api/auth/register")
                .send(testUser);

            expect(response.status).toBe(201);
            expect(response.body.success).toBe(true);
            expect(response.body.data.user.email).toBe(testUser.email);
            expect(response.body.data.user.username).toBe(testUser.username);
        });

        it("should not register a user with an existing email", async () => {
            const response = await request(app)
                .post("/api/auth/register")
                .send(testUser);

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
        });

        it("should return 400 for registration with existing username", async () => {
            const response = await request(app)
                .post("/api/auth/register")
                .send({ ...testUser, email: "different@example.com" });

            expect(response.status).toBe(400);
        });
    });

    describe("POST /api/auth/login", () => {
        it("should login successfully with correct credentials", async () => {
            const loginData = {
                identifier: testUser.email,
                password: testUser.password
            };

            const response = await request(app)
                .post("/api/auth/login")
                .send(loginData);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveProperty("token");
            expect(response.body.data.user.email).toBe(testUser.email);
        });

        it("should login successfully using username", async () => {
            const loginData = {
                identifier: testUser.username,
                password: testUser.password
            };

            const response = await request(app)
                .post("/api/auth/login")
                .send(loginData);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
        });

        it("should return 401 for incorrect password", async () => {
            const loginData = {
                identifier: testUser.email,
                password: "wrongpassword"
            };

            const response = await request(app)
                .post("/api/auth/login")
                .send(loginData);

            expect(response.status).toBe(401);
            expect(response.body.success).toBe(false);
        });

        it("should return 401 for login with non-existent email", async () => {
            const response = await request(app)
                .post("/api/auth/login")
                .send({ identifier: "nonexistent@example.com", password: "Password123!" });

            expect(response.status).toBe(401);
        });
    });

    describe("POST /api/auth/forgot-password", () => {
        it("should send a reset code to a valid email", async () => {
            const response = await request(app)
                .post("/api/auth/forgot-password")
                .send({ email: testUser.email });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
        });
    });

    describe("POST /api/auth/logout-all", () => {
        it("should logout successfully from all sessions", async () => {
            // First login to get a token
            const loginRes = await request(app)
                .post("/api/auth/login")
                .send({
                    identifier: testUser.email,
                    password: testUser.password
                });
            const token = loginRes.body.data.token;

            const response = await request(app)
                .post("/api/auth/logout-all")
                .set("Authorization", `Bearer ${token}`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
        });
    });
});