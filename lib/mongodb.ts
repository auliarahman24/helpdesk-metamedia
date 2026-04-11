import mongoose from "mongoose";

/**
 * Global cache to prevent multiple connections in development
 * due to Next.js hot-reloading.
 */
interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
  uriPromise: Promise<string> | null;
  seeded: boolean;
}

declare global {
  // eslint-disable-next-line no-var
  var mongooseCache: MongooseCache | undefined;
}

const cached: MongooseCache = global.mongooseCache ?? {
  conn: null,
  promise: null,
  uriPromise: null,
  seeded: false,
};

if (!global.mongooseCache) {
  global.mongooseCache = cached;
}

/**
 * Mendapatkan URI MongoDB (thread-safe via shared promise).
 * Jika MONGODB_URI berisi placeholder, gunakan MongoMemoryServer.
 */
function getMongoURI(): Promise<string> {
  if (cached.uriPromise) return cached.uriPromise;

  const envUri = process.env.MONGODB_URI || "";
  const isPlaceholder =
    !envUri ||
    envUri.includes("USERNAME") ||
    envUri.includes("PASSWORD") ||
    envUri.includes("<");

  if (!isPlaceholder) {
    cached.uriPromise = Promise.resolve(envUri);
    return cached.uriPromise;
  }

  console.log("⚠️  MONGODB_URI placeholder detected → MongoMemoryServer...");
  cached.uriPromise = import("mongodb-memory-server").then(
    async ({ MongoMemoryServer }) => {
      const mongod = await MongoMemoryServer.create();
      const uri = mongod.getUri();
      console.log("✅ MongoMemoryServer started:", uri);
      return uri;
    }
  );

  return cached.uriPromise;
}



async function dbConnect(): Promise<typeof mongoose> {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const uri = await getMongoURI();

    cached.promise = mongoose
      .connect(uri, { bufferCommands: true })
      .then((m) => {
        console.log("✅ MongoDB connected successfully");
        return m;
      });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  // Seed AFTER connection is fully established

  return cached.conn;
}

export default dbConnect;
