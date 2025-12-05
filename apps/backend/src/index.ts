import { Hono } from "hono";
import reactionsRouter from "./routes/reactions.js";

const app = new Hono();

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
