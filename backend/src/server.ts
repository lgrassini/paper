/**
 * server.ts — Express application entry point.
 * Initialises middleware, mounts route handlers, and starts the HTTP server.
 */

import "dotenv/config";
import express from "express";

const app = express();
const PORT = process.env.PORT ?? "3001";

// Parse incoming JSON request bodies.
app.use(express.json());

// TODO: mount route handlers here once they exist (e.g. app.use('/api', convertRouter))

app.listen(PORT, () => {
  // TODO: replace with a proper logger once one is wired up.
  process.stdout.write(`Server listening on http://localhost:${PORT}\n`);
});
