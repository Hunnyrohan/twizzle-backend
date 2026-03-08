import request from "supertest";
import { app } from "../../app";
import User from "../../models/user.model";
import Tweet from "../../models/tweet.model";
import Interaction from "../../models/interaction.model";

describe("Bookmark Integration Tests", () => {
    let token: string;
    let userId: string;
    let tweetId: string;

    const testUser = {
        name: "Bookmark Test",
        username: "bookmark_test",
        email: "bookmark_test@example.com",
        password: "Password123!",
    };

    beforeAll(async () => {
        await User.deleteOne({ email: testUser.email });
        const res = await request(app).post("/api/auth/register").send(testUser);
        const login = await request(app).post("/api/auth/login").send({
            identifier: testUser.email,
            password: testUser.password
        });
        token = login.body.data.token;
        userId = login.body.data.user._id;

        const tweetRes = await request(app)
            .post("/api/tweets")
            .set("Authorization", `Bearer ${token}`)
            .send({ content: "Bookmarking this!" });
        tweetId = tweetRes.body.data._id;
    });

    afterAll(async () => {
        await Interaction.deleteMany({ user: userId });
        await Tweet.deleteOne({ _id: tweetId });
        await User.deleteOne({ _id: userId });
    });

    describe("POST /api/tweets/:postId/bookmark", () => {
        it("should bookmark a tweet", async () => {
            const response = await request(app)
                .post(`/api/tweets/${tweetId}/bookmark`)
                .set("Authorization", `Bearer ${token}`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.isBookmarked).toBe(true);
        });

        it("should remove a bookmark", async () => {
            const response = await request(app)
                .post(`/api/tweets/${tweetId}/bookmark`)
                .set("Authorization", `Bearer ${token}`);

            expect(response.status).toBe(200);
            expect(response.body.data.isBookmarked).toBe(false);
        });
    });

    describe("GET /api/bookmarks", () => {
        it("should fetch all bookmarked tweets", async () => {
            // Bookmark again
            await request(app)
                .post(`/api/tweets/${tweetId}/bookmark`)
                .set("Authorization", `Bearer ${token}`);

            const response = await request(app)
                .get("/api/bookmarks")
                .set("Authorization", `Bearer ${token}`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.items.length).toBeGreaterThanOrEqual(1);
            expect(response.body.data.items[0]._id).toBe(tweetId);
        });
    });
});
