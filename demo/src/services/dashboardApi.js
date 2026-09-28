const API_URL = (import.meta.env?.VITE_API_URL || "http://localhost:8080").replace(/\/$/, "");
export async function getDashboard() {
  const response = await fetch(`${API_URL}/api/dashboard`, { headers: { "Content-Type": "application/json" } });
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(body?.message || "Não foi possível carregar o dashboard.");
  return body;
}
