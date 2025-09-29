
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import bcrypt from "bcrypt";
import { storage } from "./storage";
import MemoryStore from "memorystore";

const users = new Map([
  ["admin@example.com", { 
    id: "admin-1", 
    email: "admin@example.com", 
    password: "$2b$12$LQv3c1yqBWVHxkd0LQ4YCOdyy4w5r5w5r5w5r5w5r5w5r5w5r5w5r", // "password123"
    firstName: "Admin", 
    lastName: "User", 
    role: "admin" 
  }],
  ["instructor@example.com", { 
    id: "instructor-1", 
    email: "instructor@example.com", 
    password: "$2b$12$LQv3c1yqBWVHxkd0LQ4YCOdyy4w5r5w5r5w5r5w5r5w5r5w5r5w5r", // "password123"
    firstName: "John", 
    lastName: "Instructor", 
    role: "instructor" 
  }],
  ["student@example.com", { 
    id: "student-1", 
    email: "student@example.com", 
    password: "$2b$12$LQv3c1yqBWVHxkd0LQ4YCOdyy4w5r5w5r5w5r5w5r5w5r5w5r5w5r", // "password123"
    firstName: "Jane", 
    lastName: "Student", 
    role: "student" 
  }]
]);

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  
  console.log("Using memory session store for local development");
  const memoryStore = MemoryStore(session);
  const sessionStore = new memoryStore({
    checkPeriod: 86400000, // prune expired entries every 24h
  });
  
  return session({
    secret: process.env.SESSION_SECRET || "local-dev-secret-key",
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: false, // Set to false for local development
      maxAge: sessionTtl,
    },
  });
}

export async function setupAuth(app: Express) {
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  // Local strategy for email/password authentication
  passport.use(new LocalStrategy(
    { usernameField: 'email' },
    async (email, password, done) => {
      try {
        const user = users.get(email);
        if (!user) {
          return done(null, false, { message: 'User not found' });
        }

        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) {
          return done(null, false, { message: 'Invalid password' });
        }

        // Upsert user in database
        await storage.upsertUser({
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          profileImageUrl: null,
          role: user.role as "instructor" | "student" | "admin",
        });

        return done(null, user);
      } catch (error) {
        return done(error);
      }
    }
  ));

  passport.serializeUser((user: any, cb) => cb(null, user.id));
  passport.deserializeUser(async (id: string, cb) => {
    try {
      // Find user by id
      const user = Array.from(users.values()).find(u => u.id === id);
      if (user) {
        cb(null, user);
      } else {
        cb(null, false);
      }
    } catch (error) {
      cb(error);
    }
  });

  // Login route
  app.post("/api/login", passport.authenticate("local"), (req, res) => {
    res.json({ message: "Login successful", user: req.user });
  });

  // Logout route
  app.post("/api/logout", (req, res) => {
    req.logout(() => {
      res.json({ message: "Logout successful" });
    });
  });

  // Registration route (for adding new users in development)
  app.post("/api/register", async (req, res) => {
    try {
      const { email, password, firstName, lastName, role } = req.body;
      
      if (users.has(email)) {
        return res.status(400).json({ message: "User already exists" });
      }

      const hashedPassword = await bcrypt.hash(password, 12);
      const userId = `${role}-${Date.now()}`;
      
      users.set(email, {
        id: userId,
        email,
        password: hashedPassword,
        firstName,
        lastName,
        role
      });

      res.json({ message: "User registered successfully" });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ message: "Registration failed" });
    }
  });
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  next();
};
