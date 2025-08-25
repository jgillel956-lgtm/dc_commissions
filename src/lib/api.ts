import axios from "axios";

export const api = axios.create({ baseURL: "/api" });

api.interceptors.response.use(
  (r) => r,
  (err) => {
    // Let callers decide how to react. We only pass through 503 data.
    return Promise.reject(err);
  }
);

