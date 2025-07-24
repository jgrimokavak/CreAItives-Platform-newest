import session from "express-session";
import type { Express, RequestHandler } from "express";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";

// Check if user email is from @kavak.com domain
function isKavakUser(email: string | null): boolean {
  if (!email) return false;
  return email.toLowerCase().endsWith('@kavak.com');
}

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  const sessionSecret = process.env.SESSION_SECRET || 'fallback-secret-for-development-only-' + Math.random().toString(36);
  
  return session({
    secret: sessionSecret,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: sessionTtl,
    },
  });
}

// Mock authentication for now - replace with actual Replit Auth later
export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());

  // Mock login endpoint
  app.get("/api/login", (req, res) => {
    const returnTo = req.query.returnTo as string || '/';
    res.redirect(`/mock-login?returnTo=${encodeURIComponent(returnTo)}`);
  });

  // Mock callback endpoint
  app.post("/api/callback", async (req, res) => {
    const { email, firstName, lastName } = req.body;
    
    if (!isKavakUser(email)) {
      return res.redirect('/home?error=access_denied');
    }

    // Store user in session
    (req.session as any).user = {
      id: email,
      email,
      firstName,
      lastName,
      profileImageUrl: null
    };

    // Store user in database
    await storage.upsertUser({
      id: email,
      email,
      firstName,
      lastName,
      profileImageUrl: null,
    });

    res.redirect('/');
  });

  app.get("/api/logout", (req, res) => {
    req.session.destroy(() => {
      res.redirect('/home');
    });
  });
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  const user = (req.session as any)?.user;

  if (!user) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  // Check if user email is from @kavak.com domain
  if (!isKavakUser(user.email)) {
    console.log(`Access denied for non-Kavak user: ${user.email}`);
    return res.status(401).json({ message: "Access restricted to @kavak.com users only" });
  }

  next();
};