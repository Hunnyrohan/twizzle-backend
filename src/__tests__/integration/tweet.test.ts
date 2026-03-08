import request from "supertest";
import { app } from "../../app";
import User from "../../models/user.model";
import Tweet from "../../models/tweet.model";

describe("Tweet Integration Tests", () => {
    let token: string;
    let userId: string;
    let tweetId: string;

    const testUser = {
        name: "Tweet Test User",
        username: "tweet_tester",
        email: "tweet_tester@example.com",
        password: "Password123!",
    };

    beforeAll(async () => {
        await User.deleteOne({ email: testUser.email });
        const registerRes = await request(app).post("/api/auth/register").send(testUser);
        const loginRes = await request(app).post("/api/auth/login").send({
            identifier: testUser.email,
            password: testUser.password
        });
        token = loginRes.body.data.token;
        userId = loginRes.body.data.user._id;
    });

    afterAll(async () => {
        await Tweet.deleteMany({ author: userId });
        await User.deleteOne({ _id: userId });
    });

    describe("POST /api/tweets", () => {
        it("should create a new tweet successfully", async () => {
            const response = await request(app)
                .post("/api/tweets")
                .set("Authorization", `Bearer ${token}`)
                .send({ content: "Hello world! #testing" });

            expect(response.status).toBe(201);
            expect(response.body.success).toBe(true);
            expect(response.body.data.content).toBe("Hello world! #testing");
            tweetId = response.body.data._id;
        });

        it("should return 401 when not authenticated", async () => {
            const response = await request(app)
                .post("/api/tweets")
                .send({ content: "Unauthenticated tweet" });

            expect(response.status).toBe(401);
        });

        it("should return 400 when creating tweet without content", async () => {
            const response = await request(app)
                .post("/api/tweets")
                .set("Authorization", `Bearer ${token}`)
                .send({ content: "" });

            expect(response.status).toBe(400);
        });
    });

    describe("GET /api/tweets", () => {
        it("should fetch the tweet feed", async () => {
            const response = await request(app)
                .get("/api/tweets");

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(Array.isArray(response.body.data)).toBe(true);
        });

        it("should fetch a single tweet by ID", async () => {
            const response = await request(app)
                .get(`/api/tweets/${tweetId}`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data._id).toBe(tweetId);
        });

        it("should return 404 for non-existent tweet ID", async () => {
            const response = await request(app)
                .get("/api/tweets/60d5ec49f1b2b80015f8e000"); // Valid but non-existent ObjectId

            expect(response.status).toBe(404);
        });
    });

    describe("POST /api/tweets/:id/like", () => {
        it("should like a tweet", async () => {
            const response = await request(app)
                .post(`/api/tweets/${tweetId}/like`)
                .set("Authorization", `Bearer ${token}`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
        });

        it("should unlike a tweet", async () => {
            const response = await request(app)
                .delete(`/api/tweets/${tweetId}/like`)
                .set("Authorization", `Bearer ${token}`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
        });
    });

    describe("POST /api/tweets/:id/retweet", () => {
        it("should retweet a tweet", async () => {
            const response = await request(app)
                .post(`/api/tweets/${tweetId}/retweet`)
                .set("Authorization", `Bearer ${token}`);

            expect(response.status).toBe(201);
            expect(response.body.success).toBe(true);
            expect(response.body.data.retweetOf._id).toBe(tweetId);
        });
    });

    describe("POST /api/tweets/:id/comments", () => {
        it("should comment on a tweet", async () => {
            const response = await request(app)
                .post(`/api/tweets/${tweetId}/comments`)
                .set("Authorization", `Bearer ${token}`)
                .send({ content: "This is a reply!" });

            expect(response.status).toBe(201);
            expect(response.body.success).toBe(true);
            expect(response.body.data.parentTweet).toBe(tweetId);
        });
    });

    describe("DELETE /api/tweets/:id", () => {
        it("should delete a tweet", async () => {
            const response = await request(app)
                .delete(`/api/tweets/${tweetId}`)
                .set("Authorization", `Bearer ${token}`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
        });
    });
});
