/**
 * CORS Plugin
 */

import cors from "@fastify/cors";
import type { FastifyInstance } from "fastify";
import fp from "fastify-plugin";

async function corsPlugin(fastify: FastifyInstance) {
  await fastify.register(cors, {
    origin: [
      "http://localhost:3000",
      "http://localhost:3001",
      /\.vercel\.app$/,
    ],
    methods: ["GET", "POST", "OPTIONS"],
    credentials: true,
  });
}

export default fp(corsPlugin, { name: "cors" });
