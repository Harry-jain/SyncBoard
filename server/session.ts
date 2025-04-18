import session from "express-session";
import connectPgSimple from "connect-pg-simple";

// Create the PostgreSQL session store
const createSessionStore = () => {
  const PostgresStore = connectPgSimple(session);
  return new PostgresStore({
    conObject: {
      connectionString: process.env.DATABASE_URL,
    },
    createTableIfMissing: true,
  });
};

export { createSessionStore, session };