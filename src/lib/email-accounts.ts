import { prisma } from "./prisma";
import type { EmailAccount } from "@prisma/client";

const MS_TENANT = process.env.AZURE_TENANT_ID;
const MS_CLIENT_ID = process.env.AZURE_CLIENT_ID;
const MS_CLIENT_SECRET = process.env.AZURE_CLIENT_SECRET;
const MS_OAUTH_BASE = `https://login.microsoftonline.com/${MS_TENANT || "common"}/oauth2/v2.0`;

export const MICROSOFT_DELEGATED_SCOPES = [
  "offline_access",
  "openid",
  "profile",
  "email",
  "User.Read",
  "Mail.Send",
  "Mail.ReadWrite",
];

/**
 * Build the Microsoft consent URL for a user to connect their mailbox.
 * The state value is round-tripped to the callback so we know which user initiated.
 */
export function buildMicrosoftAuthUrl(redirectUri: string, state: string): string {
  const params = new URLSearchParams({
    client_id: MS_CLIENT_ID || "",
    response_type: "code",
    redirect_uri: redirectUri,
    response_mode: "query",
    scope: MICROSOFT_DELEGATED_SCOPES.join(" "),
    state,
    prompt: "select_account",
  });
  return `${MS_OAUTH_BASE}/authorize?${params.toString()}`;
}

/**
 * Exchange an authorization code for tokens (used in the OAuth callback).
 */
export async function exchangeMicrosoftCode(code: string, redirectUri: string) {
  const params = new URLSearchParams({
    client_id: MS_CLIENT_ID || "",
    client_secret: MS_CLIENT_SECRET || "",
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
    scope: MICROSOFT_DELEGATED_SCOPES.join(" "),
  });
  const res = await fetch(`${MS_OAUTH_BASE}/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });
  if (!res.ok) {
    throw new Error(`Code exchange failed: ${res.status} ${await res.text()}`);
  }
  return (await res.json()) as {
    access_token: string;
    refresh_token: string;
    expires_in: number;
    scope: string;
    id_token?: string;
  };
}

/**
 * Refresh an account's access token using the stored refresh_token.
 * On failure the account is marked inactive with the error message.
 */
export async function refreshMicrosoftToken(account: EmailAccount): Promise<EmailAccount> {
  if (!account.refreshToken) throw new Error("No refresh token on account");
  const params = new URLSearchParams({
    client_id: MS_CLIENT_ID || "",
    client_secret: MS_CLIENT_SECRET || "",
    grant_type: "refresh_token",
    refresh_token: account.refreshToken,
    scope: MICROSOFT_DELEGATED_SCOPES.join(" "),
  });
  const res = await fetch(`${MS_OAUTH_BASE}/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });
  if (!res.ok) {
    const errorText = await res.text();
    await prisma.emailAccount.update({
      where: { id: account.id },
      data: {
        lastError: `Refresh failed: ${errorText.slice(0, 500)}`,
        isActive: false,
      },
    });
    throw new Error(`Failed to refresh Microsoft token: ${res.status} ${errorText}`);
  }
  const data = await res.json();
  return prisma.emailAccount.update({
    where: { id: account.id },
    data: {
      accessToken: data.access_token,
      refreshToken: data.refresh_token || account.refreshToken,
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
      lastError: null,
    },
  });
}

/**
 * Return a fresh access token for the given account, refreshing if needed.
 */
export async function getValidAccessToken(account: EmailAccount): Promise<string> {
  const expiresAt = account.expiresAt?.getTime() ?? 0;
  const needsRefresh = !account.accessToken || expiresAt < Date.now() + 60_000;
  if (needsRefresh) {
    const refreshed = await refreshMicrosoftToken(account);
    return refreshed.accessToken!;
  }
  return account.accessToken!;
}

/**
 * Get the active default mailbox account for a user, or null.
 * Wrapped in try/catch — stale Prisma client may not know about EmailAccount.
 */
export async function getActiveAccountForUser(userId: string): Promise<EmailAccount | null> {
  try {
    return await prisma.emailAccount.findFirst({
      where: { userId, isActive: true },
      orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
    });
  } catch {
    // Stale client doesn't know about EmailAccount model — that's fine,
    // no one has connected a mailbox yet anyway. Fall through to null → shared mailbox.
    return null;
  }
}

// ─── Sending context (delegated user mailbox vs shared app mailbox) ────

export type SendingContext =
  | {
      mode: "delegated";
      token: string;
      fromAddress: string;
      displayName: string | null;
      userId: string;
      graphUserPath: string; // "/me"
    }
  | {
      mode: "app";
      token: string;
      fromAddress: string;
      displayName: null;
      userId: null;
      graphUserPath: string; // "/users/{shared}"
    };

let cachedAppToken: { token: string; expiresAt: number } | null = null;

/**
 * App-only token for the shared mailbox (client credentials flow).
 * Used as a fallback when no per-user account is connected.
 */
export async function getSharedMailboxAppToken(): Promise<string> {
  if (cachedAppToken && cachedAppToken.expiresAt > Date.now() + 60_000) {
    return cachedAppToken.token;
  }
  const params = new URLSearchParams({
    client_id: MS_CLIENT_ID || "",
    client_secret: MS_CLIENT_SECRET || "",
    scope: "https://graph.microsoft.com/.default",
    grant_type: "client_credentials",
  });
  const res = await fetch(`${MS_OAUTH_BASE}/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });
  if (!res.ok) {
    throw new Error(`Shared mailbox token fetch failed: ${res.status} ${await res.text()}`);
  }
  const data = await res.json();
  cachedAppToken = {
    token: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };
  return cachedAppToken.token;
}

/**
 * Returns a sending context for a given user. If the user has a connected
 * mailbox, returns a delegated context (their account). Otherwise falls back
 * to the shared marketing mailbox via app-only auth.
 */
export async function getSendingContext(senderUserId?: string | null): Promise<SendingContext> {
  if (senderUserId) {
    const account = await getActiveAccountForUser(senderUserId);
    if (account && account.provider === "microsoft" && account.refreshToken) {
      try {
        const token = await getValidAccessToken(account);
        return {
          mode: "delegated",
          token,
          fromAddress: account.emailAddress,
          displayName: account.displayName,
          userId: senderUserId,
          graphUserPath: "/me",
        };
      } catch (e) {
        console.error(
          "[email-accounts] delegated token unavailable, falling back to shared mailbox:",
          e
        );
      }
    }
  }
  const sharedToken = await getSharedMailboxAppToken();
  const sharedFrom = process.env.SMTP_FROM || "cloud@synergificsoftware.com";
  return {
    mode: "app",
    token: sharedToken,
    fromAddress: sharedFrom,
    displayName: null,
    userId: null,
    graphUserPath: `/users/${sharedFrom}`,
  };
}

/**
 * For inbox sync — list all mailboxes we should poll. Always includes the
 * shared mailbox; also includes every active per-user connected account.
 */
export async function listAllSyncableMailboxes() {
  try {
    const accounts = await prisma.emailAccount.findMany({
      where: { isActive: true, provider: "microsoft" },
    });
    return accounts;
  } catch {
    // Stale client doesn't know about EmailAccount — return empty
    return [];
  }
}
