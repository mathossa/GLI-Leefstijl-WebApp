// No external HTTP check: verify application and database inside the app container.
try {
  const response = await fetch("http://127.0.0.1:3000/api/health", {
    cache: "no-store",
    signal: AbortSignal.timeout(4000),
  });
  if (response.status !== 200) process.exitCode = 1;
} catch {
  process.exitCode = 1;
}
