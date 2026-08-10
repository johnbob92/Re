import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

declare global {
  var mongooseConn: {
    conn: typeof mongoose | null;
    promise: Promise<typeof mongoose> | null;
    memoryServer?: MongoMemoryServer;
  };
}

const cached = global.mongooseConn || { conn: null, promise: null };
if (!global.mongooseConn) global.mongooseConn = cached;

async function resolveUri() {
  if (process.env.MONGODB_URI && process.env.USE_MEMORY_DB !== "true") {
    return process.env.MONGODB_URI;
  }

  if (!cached.memoryServer) {
    cached.memoryServer = await MongoMemoryServer.create({
      instance: { dbName: "recruiter-system" },
    });
  }

  return cached.memoryServer.getUri("recruiter-system");
}

export async function connectDB() {
  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    const uri = await resolveUri();
    cached.promise = mongoose.connect(uri, {
      bufferCommands: false,
      maxPoolSize: 20,
      minPoolSize: 2,
      serverSelectionTimeoutMS: 10000,
    });
  }

  cached.conn = await cached.promise;

  // Auto-seed demo data for memory DB / empty databases
  if (process.env.AUTO_SEED !== "false") {
    const { ensureDemoSeed } = await import("./seed-demo");
    await ensureDemoSeed();
  }

  return cached.conn;
}
