import request from "supertest";
import { app } from "../../app";
import User from "../../models/user.model";
import Message from "../../models/message.model";
import Conversation from "../../models/conversation.model";

describe("Message Integration Tests", () => {
    let token1: string;
    let userId1: string;
    let token2: string;
    let userId2: string;
    let conversationId: string;

    const user1 = {
        name: "Sender",
        username: "sender_test",
        email: "sender_test@example.com",
        password: "Password123!",
    };

    const user2 = {
        name: "Receiver",
        username: "receiver_test",
        email: "receiver_test@example.com",
        password: "Password123!",
    };

    beforeAll(async () => {
        await User.deleteMany({ email: { $in: [user1.email, user2.email] } });

        const login1 = await request(app).post("/api/auth/register").send(user1).then(() =>
            request(app).post("/api/auth/login").send({ identifier: user1.email, password: user1.password })
        );
        token1 = login1.body.data.token;
        userId1 = login1.body.data.user._id;

        const login2 = await request(app).post("/api/auth/register").send(user2).then(() =>
            request(app).post("/api/auth/login").send({ identifier: user2.email, password: user2.password })
        );
        token2 = login2.body.data.token;
        userId2 = login2.body.data.user._id;

        // Requirement: Target user must follow the sender
        const Follow = require("../../models/follow.model").default;
        await Follow.create({ follower: userId2, following: userId1 });
    });

    afterAll(async () => {
        await Message.deleteMany({ $or: [{ sender: userId1 }, { sender: userId2 }] });
        await Conversation.deleteMany({ participants: { $in: [userId1, userId2] } });
        await User.deleteMany({ _id: { $in: [userId1, userId2] } });
    });

    describe("POST /api/messages/conversations", () => {
        it("should start a conversation and send a message", async () => {
            const response = await request(app)
                .post("/api/messages/conversations")
                .set("Authorization", `Bearer ${token1}`)
                .send({
                    userId: userId2,
                    content: "Hello from User 1!"
                });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            conversationId = response.body.data.id || response.body.data._id;
        });
    });

    describe("GET /api/messages/conversations", () => {
        it("should fetch all conversations for a user", async () => {
            const response = await request(app)
                .get("/api/messages/conversations")
                .set("Authorization", `Bearer ${token1}`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(Array.isArray(response.body.data)).toBe(true);
        });
    });

    describe("POST /api/messages/conversations/:id/messages", () => {
        it("should send a message in a conversation", async () => {
            const response = await request(app)
                .post(`/api/messages/conversations/${conversationId}/messages`)
                .set("Authorization", `Bearer ${token1}`)
                .send({
                    text: "Another message!"
                });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
        });
    });

    describe("GET /api/messages/conversations/:id/messages", () => {
        it("should fetch messages in a conversation", async () => {
            const response = await request(app)
                .get(`/api/messages/conversations/${conversationId}/messages`)
                .set("Authorization", `Bearer ${token1}`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(Array.isArray(response.body.data.items)).toBe(true);
        });
    });

    describe("DELETE /api/messages/:messageId", () => {
        it("should delete a specific message", async () => {
            const msg = await Message.findOne({ conversationId: conversationId });
            const response = await request(app)
                .delete(`/api/messages/${msg?._id}`)
                .set("Authorization", `Bearer ${token1}`)
                .send({ type: 'me' });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
        });
    });
});
