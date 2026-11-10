// Use the same origin in production; localhost is used only with Live Server.
const isLiveServer = ["5500", "5501"].includes(window.location.port);
const apiBaseUrl = isLiveServer ? "http://localhost:3000/api" : "/api";

export const API_BASE = apiBaseUrl;
