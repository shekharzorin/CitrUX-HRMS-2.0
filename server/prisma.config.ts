import dotenv from 'dotenv';
dotenv.config();

export default {
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts"
  }
};
