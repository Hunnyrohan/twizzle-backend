// import request from "supertest";
// import app from 
// import { UserModel } from "../../models/user.model";
// describe(
//     "Authentication Integration Tests",  // name of test suite/group
//     () => { // what to do in test
//         const testUser = {
//             username: "testuser",
//             email: "testuser@example.com",
//             password: "Test@1234",
//             confirmPassword: "Test@1234",
//             firstName: "Test",
//             lastName: "User"
//         };
//         beforeAll(async () => {
//             // Clean up test user if exists
//             await UserModel.deleteOne({ email: testUser.email });
//         });
//         afterAll(async () => {
//             // Clean up test user after tests
//             await UserModel.deleteOne({ email: testUser.email });
//         });

//         describe(
//             "POST /api/auth/register", // nested test suite/group
//             () => {
//                 test(
//                     "should register a new user", // name of individual test
//                     async () => { // what to do in test
//                         const response = await request(app)
//                             .post("/api/auth/register")
//                             .send(testUser)
                        
//                         expect(response.status).toBe(201);
//                         expect(response.body).toHaveProperty(
//                             "message", 
//                             "User registered successfully"
//                         );
//                     }
//                 )
//             }
//         )
//     }
// )