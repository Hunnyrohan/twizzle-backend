import request from "supertest";
import { app } from "../../app";
import User from "../../models/user.model";
import Notification from "../../models/notification.model";

describe("Notification Integration Tests", () => {
    let token: string;
    let userId: string;

    const testUser = {
        name: "Notification Test",
        username: "notify_test",
        email: "notify_test@example.com",
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

        // Manually create some notifications
        await Notification.create([
            {
                recipientId: userId,
                actorId: userId,
                type: 'like',
                isRead: false
            },
            {
                recipientId: userId,
                actorId: userId,
                type: 'follow',
                isRead: false
            }
        ]);
    });

    afterAll(async () => {
        await Notification.deleteMany({ recipientId: userId });
        await User.deleteOne({ _id: userId });
    });

    describe("GET /api/notifications", () => {
        it("should fetch all notifications for the user", async () => {
            const response = await request(app)
                .get("/api/notifications")
                .set("Authorization", `Bearer ${token}`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.items.length).toBeGreaterThanOrEqual(2);
        });
    });

    describe("PUT /api/notifications/read-all", () => {
        it("should mark all notifications as read", async () => {
            const response = await request(app)
                .post("/api/notifications/read-all")
                .set("Authorization", `Bearer ${token}`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);

            // Verify they are read
            const unreadCount = await Notification.countDocuments({ recipientId: userId, isRead: false });
            expect(unreadCount).toBe(0);
        });
    });

    describe("POST /api/notifications/:id/read", () => {
        it("should mark a specific notification as read", async () => {
            const notif = await Notification.create({
                recipientId: userId,
                actorId: userId,
                type: 'repost',
                isRead: false
            });

            const response = await request(app)
                .post(`/api/notifications/${notif._id}/read`)
                .set("Authorization", `Bearer ${token}`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
        });
    });
});
