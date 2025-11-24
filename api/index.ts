import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "../server/routes";

// Create Express app
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Initialize routes once
let routesInitialized = false;
let initPromise: Promise<void> | null = null;

async function initializeRoutes() {
  if (routesInitialized) return;
  if (initPromise) return initPromise;
  
  initPromise = (async () => {
    try {
      console.log("Initializing routes for Vercel serverless...");
      await registerRoutes(app);
      routesInitialized = true;
      console.log("Routes initialized successfully");
    } catch (error) {
      console.error("Failed to initialize routes:", error);
      initPromise = null; // Reset so we can try again
      throw error;
    }
  })();
  
  return initPromise;
}

// Error handler
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  const status = err.status || err.statusCode || 500;
  const message = err.message || "Internal Server Error";
  console.error("API Error:", {
    status,
    message,
    stack: err.stack,
    url: _req.url,
    method: _req.method
  });
  res.status(status).json({ message });
});

// Export handler for Vercel serverless
export default async (req: Request, res: Response) => {
  try {
    // Ensure routes are initialized
    await initializeRoutes();
    
    // Handle the request with Express
    return app(req, res);
  } catch (error: any) {
    console.error("Serverless function error:", error);
    return res.status(500).json({ 
      message: "Internal server error",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
