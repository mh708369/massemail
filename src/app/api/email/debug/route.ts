import { NextResponse } from "next/server";

const TENANT_ID = process.env.AZURE_TENANT_ID;
const CLIENT_ID = process.env.AZURE_CLIENT_ID;
const CLIENT_SECRET = process.env.AZURE_CLIENT_SECRET;
const GRAPH_URL = "https://graph.microsoft.com/v1.0";

export async function GET() {
  const mailbox = process.env.SMTP_FROM || "cloud@synergificsoftware.com";

  // Get token
  const params = new URLSearchParams({
    client_id: CLIENT_ID || "",
    client_secret: CLIENT_SECRET || "",
    scope: "https://graph.microsoft.com/.default",
    grant_type: "client_credentials",
  });

  const tokenRes = await fetch(`https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });

  if (!tokenRes.ok) {
    return NextResponse.json({ error: "Token failed", details: await tokenRes.text() });
  }

  const { access_token } = await tokenRes.json();

  // Fetch raw inbox messages
  const url = `${GRAPH_URL}/users/${mailbox}/mailFolders/inbox/messages?$top=10&$orderby=receivedDateTime desc&$select=id,subject,bodyPreview,from,receivedDateTime`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${access_token}` } });

  if (!res.ok) {
    return NextResponse.json({ error: "Inbox fetch failed", details: await res.text() });
  }

  const data = await res.json();
  const messages = (data.value || []).map((m: { id: string; subject?: string; from?: { emailAddress?: { address?: string; name?: string } }; receivedDateTime?: string; bodyPreview?: string }) => ({
    id: m.id,
    subject: m.subject,
    from: m.from?.emailAddress?.address,
    fromName: m.from?.emailAddress?.name,
    receivedAt: m.receivedDateTime,
    preview: m.bodyPreview?.slice(0, 100),
    fromSelf: m.from?.emailAddress?.address?.toLowerCase() === mailbox.toLowerCase(),
  }));

  return NextResponse.json({
    mailbox,
    totalInInbox: messages.length,
    messages,
    note: "Messages with fromSelf=true are skipped by sync. Only messages from contacts in the DB will be matched.",
  });
}
