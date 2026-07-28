import { useEffect, useState } from "react";

type HealthStatus = "loading" | "ok" | "error";

export function App() {
  const [status, setStatus] = useState<HealthStatus>("loading");

  useEffect(() => {
    fetch("/api/health")
      .then((res) => {
        if (!res.ok) throw new Error(`unexpected status ${res.status}`);
        return res.json() as Promise<{ status: string }>;
      })
      .then((data) => setStatus(data.status === "ok" ? "ok" : "error"))
      .catch(() => setStatus("error"));
  }, []);

  return (
    <main>
      <h1>loop-basic sample app</h1>
      <p>
        backend status: <span data-testid="health-status">{status}</span>
      </p>
    </main>
  );
}
