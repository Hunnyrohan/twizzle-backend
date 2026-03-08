import request from "supertest";
import { app } from "../../app";
import User from "../../models/user.model";

describe("User Integration Tests", () => {
    let token1: string;
    let userId1: string;
    let token2: string;
    let userId2: string;

    const user1 = {
        name: "User One",
        username: "userone_test",
        email: "userone_test@example.com",
        password: "Password123!",
    };

    const user2 = {
        name: "User Two",
        username: "usertwo_test",
        email: "usertwo_test@example.com",
        password: "Password123!",
    };

    beforeAll(async () => {
        await User.deleteMany({ email: { $in: [user1.email, user2.email] } });

        const res1 = await request(app).post("/api/auth/register").send(user1);
        const login1 = await request(app).post("/api/auth/login").send({
            identifier: user1.email,
            password: user1.password
        });
        token1 = login1.body.data.token;
        userId1 = login1.body.data.user._id;

        const res2 = await request(app).post("/api/auth/register").send(user2);
        const login2 = await request(app).post("/api/auth/login").send({
            identifier: user2.email,
            password: user2.password
        });
        token2 = login2.body.data.token;
        userId2 = login2.body.data.user._id;
    });

    afterAll(async () => {
        await User.deleteMany({ _id: { $in: [userId1, userId2] } });
    });

    describe("GET /api/users/profile/:username", () => {
        it("should fetch user profile by username", async () => {
            const response = await request(app)
                .get(`/api/users/${user1.username}`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.username).toBe(user1.username);
        });

        it("should return 404 for non-existent username", async () => {
            const response = await request(app)
                .get("/api/users/profile/nonexistent_user_123");

            expect(response.status).toBe(404);
        });
    });

    describe("PUT /api/users/profile", () => {
        it("should update own profile", async () => {
            const updateData = {
                name: "Updated Name",
                bio: "New bio here",
                location: "New Location"
            };

            const response = await request(app)
                .put("/api/users/profile")
                .set("Authorization", `Bearer ${token1}`)
                .send(updateData);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.name).toBe(updateData.name);
        });
    });

    describe("POST /api/users/:userId/follow", () => {
        it("should follow another user", async () => {
            const response = await request(app)
                .post(`/api/users/${userId2}/follow`)
                .set("Authorization", `Bearer ${token1}`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.followed).toBe(true);
        });

        it("should unfollow a user", async () => {
            const response = await request(app)
                .post(`/api/users/${userId2}/follow`)
                .set("Authorization", `Bearer ${token1}`);

            expect(response.status).toBe(200);
            expect(response.body.data.followed).toBe(false);
        });
    });

    describe("GET /api/explore/suggestions", () => {
        it("should fetch follow suggestions", async () => {
            const response = await request(app)
                .get("/api/explore/suggestions")
                .set("Authorization", `Bearer ${token1}`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(Array.isArray(response.body.data)).toBe(true);
        });
    });

    describe("GET /api/search", () => {
        it("should search for users", async () => {
            const response = await request(app)
                .get("/api/search")
                .query({ q: user2.username, filter: 'people' });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.items.some((u: any) => u.username === user2.username)).toBe(true);
        });
    });

    describe("GET /api/users/:username/followers and following", () => {
        it("should fetch user followers", async () => {
            const response = await request(app)
                .get(`/api/users/${user1.username}/followers`);

            expect(response.status).toBe(200);
            expect(Array.isArray(response.body.data)).toBe(true);
        });

        it("should fetch user following", async () => {
            const response = await request(app)
                .get(`/api/users/${user1.username}/following`);

            expect(response.status).toBe(200);
            expect(Array.isArray(response.body.data)).toBe(true);
        });
    });
});
