import "dotenv/config"; // make sure on top
import express from "express";
import cors from "cors";
import morgan from "morgan";
import mongoose from "mongoose";
// routes
import authRoutes from "./routes/auth.js";
import adRoutes from "./routes/ad.js";
import helmet from "helmet"; // For securing HTTP headers
import compression from "compression"; // For response compression
import rateLimit from "express-rate-limit"; // For rate limiting
const app = express();
const PORT = process.env.PORT || 8000;
// process json data
app.use(express.json());
// other domain can make api request without cors errors
app.use(cors());
// show url logs in console
app.use(morgan("dev"));
// Set security-related HTTP headers
app.use(helmet());
// Compress response bodies
app.use(compression());
// Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes window
  max: 100, // Limit each IP to 100 requests per windowMs
  message: "Too many requests from this IP, please try again later.",
});
app.use(limiter); // Apply rate limiting to all requests
// Connect to MongoDB
mongoose
  .connect(process.env.DATABASE)
  .then(() => {
    console.log("DB connected");
    // Define route middlewares
    app.use("/api", authRoutes);
    app.use("/api", adRoutes);
    // Global error handler middleware
    app.use((err, req, res, next) => {
      console.error(err.stack);
      res.status(500).json({
        error: "Something went wrong!",
      });
    });
    // Start the server
    app.listen(8000, () => {
      console.log(`Server is running on port ${PORT}`);
    });
    // Graceful shutdown
    const shutdown = () => {
      server.close(() => {
        console.log("Server shut down gracefully");
        mongoose.connection.close(false, () => {
          console.log("MongoDB connection closed");
          process.exit(0); // Exit the process after closing the
          connection;
        });
      });
    };
    // Handle termination signals
    process.on("SIGTERM", shutdown);
    process.on("SIGINT", shutdown);
  })
  .catch((err) => {
    console.error("DB connection error:", err);
  });
