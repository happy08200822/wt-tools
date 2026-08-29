import mongoose from 'mongoose';

const envUri = process.env.MONGODB_URI;

if (!envUri) {
  throw new Error('請在 .env.local 設定 MONGODB_URI');
}

const uri: string = envUri;

type MongooseCache = {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
};

// 開發模式下用 global 變數快取連線，避免 Next.js 熱重載時重複建立連線
const globalWithMongoose = global as typeof globalThis & {
  _mongooseCache?: MongooseCache;
};

const cache: MongooseCache = globalWithMongoose._mongooseCache ?? { conn: null, promise: null };
globalWithMongoose._mongooseCache = cache;

export default async function dbConnect() {
  if (cache.conn) return cache.conn;
  if (!cache.promise) {
    cache.promise = mongoose.connect(uri, { bufferCommands: false });
  }
  cache.conn = await cache.promise;
  return cache.conn;
}
