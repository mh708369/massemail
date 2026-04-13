import { prisma } from "@/lib/prisma";
import { streamText } from "@/lib/ai";

export async function POST(req: Request) {
  const { messages, ticketId } = await req.json();

  // Fetch knowledge base for context
  const kbArticles = await prisma.knowledgeBase.findMany({
    where: { isPublished: true },
  });

  const kbContext = kbArticles.length > 0
    ? kbArticles.map((a) => `Q: ${a.question}\nA: ${a.answer}`).join("\n\n")
    : "No knowledge base articles available yet.";

  const systemPrompt = `You are a helpful AI support assistant for our business. Use the following knowledge base to answer questions when relevant. If you don't know the answer, say so honestly and offer to connect the customer with a human agent.

Knowledge Base:
${kbContext}

Be concise, friendly, and professional.`;

  try {
    const stream = await streamText(systemPrompt, messages);

    // Save messages to DB if linked to a ticket
    if (ticketId) {
      const lastUserMsg = messages[messages.length - 1];
      if (lastUserMsg?.role === "user") {
        await prisma.chatMessage.create({
          data: { ticketId, role: "user", content: lastUserMsg.content },
        });
      }
    }

    const encoder = new TextEncoder();
    let fullResponse = "";

    const readable = new ReadableStream({
      async start(controller) {
        const response = await stream.finalMessage();
        const block = response.content[0];
        if (block.type === "text") {
          fullResponse = block.text;
          controller.enqueue(encoder.encode(fullResponse));
        }

        // Save assistant response to DB
        if (ticketId && fullResponse) {
          await prisma.chatMessage.create({
            data: { ticketId, role: "assistant", content: fullResponse },
          });
        }

        controller.close();
      },
    });

    return new Response(readable, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: "Chat failed", details: String(error) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
