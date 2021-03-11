const server = require("../src/server");
const request = require("supertest")(server);
const mongoose = require("mongoose");
const UserModel = require("../src/services/users/schema");
const jwt = require("jsonwebtoken");

beforeAll((done) => {
  mongoose.connect(`${process.env.MONGO_CONNECTION}/test`, { useNewUrlParser: true, useUnifiedTopology: true }, () => {
    console.log("Successfully connected to Atlas.");
    done();
  });
});

afterAll((done) => {
  mongoose.connection.db.dropDatabase(() => {
    mongoose.connection.close(() => done());
  });
});

// I: Testing a test

describe("Stage I: Testing tests", () => {
  it("should check that true is true", () => {
    expect(true).toBe(true);
  });

  it("should check that the /test endpoint is working correctly", async () => {
    const response = await request.get("/test");
    expect(response.status).toEqual(200);
    expect(response.body.message).not.toBeFalsy();
    expect(response.body.message).toEqual("Test success");
  });
});

// II: Testing user creation and login
const validCredentials = {
  username: "luisanton.io",
  password: "password",
  email: "luisanton@gmail.com",
  firstname: "Luis",
  lastname: "Anton",
};

const invalidCredentials = {
  username: "luisanton.io",
  email: "luisantongmail.com",
  firstname: "Luis",
  lastname: "Anton",
};

const incorrectCredentials = {
  username: "luisanton.io",
  password: "incorrectPassword",
};
let validtocken = "";

describe("Stage II: testing user creation and login", () => {
  it("should return an id from a /users/register endpoint when provided with valid credentials", async () => {
    const response = await request.post("/users/register").send(validCredentials);
    const { _id } = response.body;
    expect(_id).not.toBeFalsy();
    expect(typeof _id).toBe("string");
    const user = await UserModel.findById(_id);
    expect(user).toBeDefined();
  });

  it("should NOT return an id from a /users/register endpoint when provided with invalid credentials", async () => {
    const response = await request.post("/users/register").send(invalidCredentials);
    expect(response.status).toBe(400);
    expect(response.body.errorCode).toBe("wrong_credentials");
  });

  it("should return a valid token when loggin in with correct credentials", async () => {
    // "VALID_TOKEN"
    const response = await request.post("/users/login").send(validCredentials); //
    const { ok } = response.body;
    expect(ok).toBe(true);
    validtocken = response.headers["set-cookie"][0].split("=")[1].split(";")[0];
    const valid = await jwt.verify(validtocken, process.env.JWT_SECRET, (err, decoded) => {
      if (err) return false;
      return decoded;
    });

    expect(valid).toBeDefined();
    expect(valid).not.toBeFalsy();
    const user = await UserModel.findById(valid._id);
    expect(user).toBeDefined();
    const correct = user.email === validCredentials.email;
    expect(correct).toBe(true);
  });

  it("should NOT return a valid token when loggin in with INCORRECT credentials", async () => {
    const response = await request.post("/users/login").send(incorrectCredentials);

    expect(response.status).toBe(401);

    const { token } = response.body;

    expect(token).not.toBeDefined();
  });
});
