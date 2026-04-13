export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startFollowUpScheduler } = await import("./lib/scheduler");
    startFollowUpScheduler();
  }
}
