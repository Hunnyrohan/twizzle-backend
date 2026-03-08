import request from "supertest";
import { app } from "../../app";

describe("Search Integration Tests", () => {
    it("should search for people", async () => {
        const response = await request(app).get("/api/search?q=test&filter=people");
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(Array.isArray(response.body.data.items)).toBe(true);
    });

    it("should search for latest tweets", async () => {
        const response = await request(app).get("/api/search?q=test&filter=latest");
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(Array.isArray(response.body.data.items)).toBe(true);
    });

    it("should search for media tweets", async () => {
        const response = await request(app).get("/api/search?q=test&filter=media");
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(Array.isArray(response.body.data.items)).toBe(true);
    });

    it("should return empty results for empty query", async () => {
        const response = await request(app).get("/api/search?q=");
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.items.length).toBe(0);
    });
});
