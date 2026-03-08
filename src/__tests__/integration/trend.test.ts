import request from "supertest";
import { app } from "../../app";
import User from "../../models/user.model";

describe("Trend Integration Tests", () => {
    it("should fetch current trends", async () => {
        const response = await request(app).get("/api/trends");

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(Array.isArray(response.body.data)).toBe(true);
    });
});
