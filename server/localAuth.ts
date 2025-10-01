
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import bcrypt from "bcrypt";
import { storage } from "./storage";
import MemoryStore from "memorystore";

// Create users map with proper bcrypt hashes for "password123"
const createUsersMap = async () => {
  const passwordHash = await bcrypt.hash("password123", 12);
  console.log("Generated password hash for demo accounts:", passwordHash);
  
  return new Map([
    // Admin users
    ["admin1@example.com", { 
      id: "admin-1", 
      email: "admin1@example.com", 
      password: passwordHash,
      firstName: "Admin", 
      lastName: "One", 
      role: "admin" 
    }],
    ["admin2@example.com", { 
      id: "admin-2", 
      email: "admin2@example.com", 
      password: passwordHash,
      firstName: "Admin", 
      lastName: "Two", 
      role: "admin" 
    }],
    ["admin3@example.com", { 
      id: "admin-3", 
      email: "admin3@example.com", 
      password: passwordHash,
      firstName: "Admin", 
      lastName: "Three", 
      role: "admin" 
    }],
    
    // Instructor users
    ["instructor1@example.com", { 
      id: "instructor-1", 
      email: "instructor1@example.com", 
      password: passwordHash,
      firstName: "John", 
      lastName: "Smith", 
      role: "instructor" 
    }],
    ["instructor2@example.com", { 
      id: "instructor-2", 
      email: "instructor2@example.com", 
      password: passwordHash,
      firstName: "Sarah", 
      lastName: "Johnson", 
      role: "instructor" 
    }],
    ["instructor3@example.com", { 
      id: "instructor-3", 
      email: "instructor3@example.com", 
      password: passwordHash,
      firstName: "Michael", 
      lastName: "Brown", 
      role: "instructor" 
    }],
    
    // Student users
    ["student1@example.com", { 
      id: "student-1", 
      email: "student1@example.com", 
      password: passwordHash,
      firstName: "Jane", 
      lastName: "Doe", 
      role: "student" 
    }],
    ["student2@example.com", { 
      id: "student-2", 
      email: "student2@example.com", 
      password: passwordHash,
      firstName: "Alex", 
      lastName: "Wilson", 
      role: "student" 
    }],
    ["student3@example.com", { 
      id: "student-3", 
      email: "student3@example.com", 
      password: passwordHash,
      firstName: "Emily", 
      lastName: "Davis", 
      role: "student" 
    }]
  ]);
};

let users: Map<string, any>;
createUsersMap().then(usersMap => {
  users = usersMap;
  console.log("Demo users initialized with proper password hashes");
});

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
  // Ensure users are initialized before setting up auth
  if (!users) {
    users = await createUsersMap();
  }
  
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  // Local strategy for email/password authentication
  passport.use(new LocalStrategy(
    { usernameField: 'email' },
    async (email, password, done) => {
      try {
        console.log(`Login attempt for email: ${email}`);
        const user = users.get(email);
        if (!user) {
          console.log(`User not found: ${email}`);
          return done(null, false, { message: 'User not found' });
        }

        console.log(`Checking password for user: ${email}`);
        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) {
          console.log(`Invalid password for user: ${email}`);
          return done(null, false, { message: 'Invalid password' });
        }

        console.log(`Authentication successful for user: ${email}`);

        // Upsert user in database
        await storage.upsertUser({
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          profileImageUrl: null,
          role: user.role as "instructor" | "student" | "admin",
        });

        console.log(`User upserted in database: ${user.id}`);
        return done(null, user);
      } catch (error) {
        console.error(`Authentication error for ${email}:`, error);
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
  app.post("/api/login", (req, res, next) => {
    console.log(`Login request received for: ${req.body.email}`);
    
    passport.authenticate("local", (err, user, info) => {
      if (err) {
        console.error("Login error:", err);
        return res.status(500).json({ message: "Internal server error" });
      }
      
      if (!user) {
        console.log("Login failed:", info?.message || "Authentication failed");
        return res.status(401).json({ message: info?.message || "Invalid credentials" });
      }
      
      req.logIn(user, (err) => {
        if (err) {
          console.error("Session creation error:", err);
          return res.status(500).json({ message: "Failed to create session" });
        }
        
        console.log(`Login successful for user: ${user.email}, session ID: ${req.sessionID}`);
        res.json({ message: "Login successful", user: req.user });
      });
    })(req, res, next);
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
  console.log(`Auth check - Session ID: ${req.sessionID}, Authenticated: ${req.isAuthenticated()}, User: ${req.user ? JSON.stringify(req.user) : 'null'}`);
  
  if (!req.isAuthenticated()) {
    console.log("Authentication failed - no valid session");
    return res.status(401).json({ message: "Unauthorized" });
  }
  
  console.log("Authentication successful");
  next();
};
