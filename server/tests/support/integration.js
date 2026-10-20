import { randomBytes } from "node:crypto";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
export async function integration(name) {
  const database = `sarkari_saathi_${name}_test_${Date.now()}_${randomBytes(3).toString("hex")}`;
  Object.assign(process.env, {
    MONGO_URI: `mongodb://127.0.0.1:27017/${database}`,
    JWT_SECRET: randomBytes(48).toString("hex"),
    CLIENT_URL: "http://localhost:5176",
    NODE_ENV: "test",
    SERVE_CLIENT: "false",
  });
  const { default: app } = await import("../../src/app.js");
  const { default: User } = await import("../../src/models/User.js");
  const { seedSchemes } = await import("../../src/utils/seedSchemes.js");
  const account = async (suffix) => {
    const user = await User.create({
      name: `Test ${suffix}`,
      email: `${suffix}@example.com`,
      password: "$2b$12$dummy.test.fixture.hash.not.for.login",
    });
    return {
      user,
      headers: {
        Authorization: `Bearer ${jwt.sign({ sub: String(user._id) }, process.env.JWT_SECRET, { algorithm: "HS256", expiresIn: "1h" })}`,
      },
    };
  };
  return {
    app,
    account,
    setup: async () => {
      await mongoose.connect(process.env.MONGO_URI, {
        serverSelectionTimeoutMS: 5000,
      });
      await seedSchemes();
    },
    cleanup: async () => {
      if (mongoose.connection.name === database)
        await mongoose.connection.dropDatabase();
      await mongoose.disconnect();
    },
  };
}
