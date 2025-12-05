import { Hono } from "hono";
import { cors } from "hono/cors";
import reactionsRouter from "./routes/reactions.js";

const app = new Hono();

// CORS configuration
app.use("*", cors({
  origin: [
    "https://www.haedal.blog",
    "https://haedal.blog",
    "https://www.headal.site",
    "http://localhost:4321",
  ],
  allowMethods: ["GET", "POST", "OPTIONS"],
  allowHeaders: ["Content-Type"],
  credentials: true,
}));

app.get("/", (c) => {
  return c.json({ 
    message: "Reactions API",
    version: "1.0.0",
    endpoints: {
      "GET /reactions/:contentType/:slug": "Get reactions for content",
      "POST /reactions/:contentType/:slug": "Toggle reaction"
    }
  });
});

app.route("/reactions", reactionsRouter);

export default app;

