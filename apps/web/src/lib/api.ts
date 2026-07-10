import { createApiClient } from "@vqr/shared";

// Standard local FastAPI backend URL
const BACKEND_URL = "http://localhost:8000";

export const apiClient = createApiClient(BACKEND_URL);
