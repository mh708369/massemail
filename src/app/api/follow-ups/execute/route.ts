import { NextResponse } from "next/server";
import { startSequence, pauseSequence, cancelSequence } from "@/lib/follow-up";

export async function POST(req: Request) {
  const { action, contactId, sequenceId, executionId } = await req.json();

  if (action === "start" && contactId && sequenceId) {
    const result = await startSequence(contactId, sequenceId);
    return NextResponse.json(result);
  }

  if (action === "pause" && executionId) {
    const result = await pauseSequence(executionId);
    return NextResponse.json(result);
  }

  if (action === "cancel" && executionId) {
    const result = await cancelSequence(executionId);
    return NextResponse.json(result);
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
