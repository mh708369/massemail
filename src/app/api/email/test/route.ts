import { NextResponse } from "next/server";

const TENANT_ID = process.env.AZURE_TENANT_ID;
const CLIENT_ID = process.env.AZURE_CLIENT_ID;
const CLIENT_SECRET = process.env.AZURE_CLIENT_SECRET;

export async function GET() {
  const senderEmail = process.env.SMTP_FROM;

  if (!TENANT_ID || !CLIENT_ID || !CLIENT_SECRET) {
    return NextResponse.json({ status: "not_configured" });
  }

  // Always get a FRESH token (no caching)
  const tokenUrl = `https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/token`;
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    scope: "https://graph.microsoft.com/.default",
    grant_type: "client_credentials",
  });

  const tokenRes = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });

  if (!tokenRes.ok) {
    return NextResponse.json({ status: "token_failed", error: await tokenRes.text() });
  }

  const tokenData = await tokenRes.json();
  const token = tokenData.access_token;

  // Test the sendMail endpoint with a draft (doesn't actually send)
  // Try fetching user info first
  const userRes = await fetch(`https://graph.microsoft.com/v1.0/users/${senderEmail}?$select=displayName,mail,userPrincipalName`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  const userBody = await userRes.text();

  return NextResponse.json({
    status: userRes.ok ? "connected" : "failed",
    httpStatus: userRes.status,
    response: userBody,
    senderEmail,
    tokenIssued: true,
  });
}
