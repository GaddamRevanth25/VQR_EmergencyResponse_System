import { createApiClient } from "@vqr/shared";

// Dynamically target the backend on the same host (works on any network)
const BACKEND_URL = typeof window !== 'undefined'
  ? `http://${window.location.hostname}:8000`
  : 'http://localhost:8000';

export const apiClient = createApiClient(BACKEND_URL);
