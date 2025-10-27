import cors from "cors";
import express from "express";

import { DatabaseManager } from "@/core/database";
import { errorHandler } from "@/middlewares/error-handler";

import "@/config";
// import "./domain/notification/worker";

// API Routes
import { aiChatRouter } from "@/api/routes/ai-chat";
import { ragRouter } from "@/api/routes/rag";

class QueueServer {
  private app: express.Application;

  constructor() {
    this.app = express();
    this.setupMiddlewares();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  private setupMiddlewares(): void {
    // CORS - Allow all origins for SSE to work properly
    this.app.use(
      cors({
        origin: "*",
        credentials: true,
        methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization", "Cache-Control"],
      }),
    );

    // Body parsing
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));
  }

  private setupRoutes() {
    // SSE Routes (directly under root for easier access)
    // this.app.use("/", notificationRouter);

    // // Mail routes
    // this.app.use("/", mailRouter);

    // AI Chat routes
    this.app.use("/", aiChatRouter);

    // RAG routes
    this.app.use("/", ragRouter);

    // Root endpoint
    this.app.get("/", (req, res) => {
      res.json({
        name: "Queue Server",
        version: "1.0.0",
        status: "running",
        timestamp: new Date().toISOString(),
      });
    });

    // 404 handler - Remove wildcard to avoid path-to-regexp issues
    this.app.use((req, res) => {
      res.status(404).json({
        error: "Not Found",
        message: `Route ${req.originalUrl} not found`,
        timestamp: new Date().toISOString(),
      });
    });
  }

  private setupErrorHandling(): void {
    this.app.use(errorHandler);
  }

  async initialize(): Promise<void> {
    try {
      console.log("🚀 Starting Queue Server...");

      // Initialize database connections
      await DatabaseManager.connect();

      console.log("✅ Queue Server initialized");
    } catch (error) {
      console.error("❌ Failed to initialize Queue Server:", error);
      throw error;
    }
  }

  async start(): Promise<void> {
    try {
      await this.initialize();

      // Start listening
      const port = 3001;
      this.app.listen(port, () => {
        console.log(`🎯 Queue Server running on port ${port}`);
      });
    } catch (error) {
      console.error("❌ Failed to start Queue Server:", error);
    }
  }

  getApp(): express.Application {
    return this.app;
  }
}

// Start the server
const server = new QueueServer();
server.start();
