import { onRequest } from "firebase-functions/v2/https";
import app from "./server.js";

export const api = onRequest({ cors: true, maxInstances: 10 }, app);
