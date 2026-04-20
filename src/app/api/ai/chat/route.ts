import { prisma } from "@/lib/prisma";
import { streamText } from "@/lib/ai";

export async function POST(req: Request) {
  const { messages, ticketId } = await req.json();

  // Get the last user message to find relevant KB articles
  const lastUserMsg = messages[messages.length - 1]?.content || "";
  const searchTerms = lastUserMsg.toLowerCase().split(/\s+/).filter((w: string) => w.length > 3);

  // Fetch KB articles — score by keyword relevance, limit to top 10
  const allArticles = await prisma.knowledgeBase.findMany({
    where: { isPublished: true },
    select: { question: true, answer: true, category: true },
  });

  // Score articles by how many search terms they match
  const scored = allArticles.map((a) => {
    const text = `${a.question} ${a.answer} ${a.category || ""}`.toLowerCase();
    const score = searchTerms.reduce((s: number, term: string) => s + (text.includes(term) ? 1 : 0), 0);
    return { ...a, score };
  });

  // Take top 10 most relevant (or first 10 if no matches)
  scored.sort((a, b) => b.score - a.score);
  const relevant = scored.slice(0, 10);

  const kbContext = relevant.length > 0
    ? relevant.map((a) => `Q: ${a.question}\nA: ${a.answer.replace(/<[^>]*>/g, "").slice(0, 500)}`).join("\n\n")
    : "No knowledge base articles available yet.";

  const systemPrompt = `You are a helpful AI support assistant for Synergific Software Pvt. Ltd. — an ISO certified Indian IT services & training company.

Use the following knowledge base articles to answer questions when relevant. If the answer isn't in the KB, use your general knowledge about IT services, cloud computing, certifications, and training to help. If you truly don't know, offer to connect the customer with a human agent at cloud@synergificsoftware.com or +91 8884 907 660.

Knowledge Base:
${kbContext}

Be concise, friendly, and professional. Keep answers under 200 words.`;

  try {
    const stream = await streamText(systemPrompt, messages);

    // Save user message to DB if linked to a ticket
    if (ticketId) {
      const lastMsg = messages[messages.length - 1];
      if (lastMsg?.role === "user") {
        await prisma.chatMessage.create({
          data: { ticketId, role: "user", content: lastMsg.content },
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
