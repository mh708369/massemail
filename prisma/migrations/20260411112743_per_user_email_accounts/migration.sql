-- CreateTable
CREATE TABLE "EmailAccount" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "provider" TEXT NOT NULL DEFAULT 'microsoft',
    "emailAddress" TEXT NOT NULL,
    "displayName" TEXT,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "expiresAt" DATETIME,
    "scope" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastSyncedAt" DATETIME,
    "lastError" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "userId" TEXT NOT NULL,
    CONSTRAINT "EmailAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Contact" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "whatsappPhone" TEXT,
    "company" TEXT,
    "status" TEXT NOT NULL DEFAULT 'lead',
    "preferredChannel" TEXT NOT NULL DEFAULT 'email',
    "leadScore" INTEGER,
    "source" TEXT,
    "tags" TEXT,
    "notes" TEXT,
    "lastContactedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "ownerId" TEXT,
    CONSTRAINT "Contact_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Contact" ("company", "createdAt", "email", "id", "lastContactedAt", "leadScore", "name", "notes", "phone", "preferredChannel", "source", "status", "tags", "updatedAt", "whatsappPhone") SELECT "company", "createdAt", "email", "id", "lastContactedAt", "leadScore", "name", "notes", "phone", "preferredChannel", "source", "status", "tags", "updatedAt", "whatsappPhone" FROM "Contact";
DROP TABLE "Contact";
ALTER TABLE "new_Contact" RENAME TO "Contact";
CREATE UNIQUE INDEX "Contact_email_key" ON "Contact"("email");
CREATE TABLE "new_EmailMessage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "direction" TEXT NOT NULL DEFAULT 'outbound',
    "fromAddr" TEXT NOT NULL,
    "toAddr" TEXT NOT NULL,
    "ccAddr" TEXT,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "messageId" TEXT,
    "inReplyTo" TEXT,
    "sentAt" DATETIME,
    "openedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "aiClassification" TEXT,
    "aiSummary" TEXT,
    "aiReplied" BOOLEAN NOT NULL DEFAULT false,
    "contactId" TEXT NOT NULL,
    "userId" TEXT,
    "templateId" TEXT,
    "followUpExecId" TEXT,
    "campaignId" TEXT,
    CONSTRAINT "EmailMessage_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "EmailMessage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "EmailMessage_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "MessageTemplate" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "EmailMessage_followUpExecId_fkey" FOREIGN KEY ("followUpExecId") REFERENCES "FollowUpExecution" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "EmailMessage_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_EmailMessage" ("aiClassification", "aiReplied", "aiSummary", "body", "campaignId", "ccAddr", "contactId", "createdAt", "direction", "followUpExecId", "fromAddr", "id", "inReplyTo", "messageId", "openedAt", "sentAt", "status", "subject", "templateId", "toAddr") SELECT "aiClassification", "aiReplied", "aiSummary", "body", "campaignId", "ccAddr", "contactId", "createdAt", "direction", "followUpExecId", "fromAddr", "id", "inReplyTo", "messageId", "openedAt", "sentAt", "status", "subject", "templateId", "toAddr" FROM "EmailMessage";
DROP TABLE "EmailMessage";
ALTER TABLE "new_EmailMessage" RENAME TO "EmailMessage";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "EmailAccount_userId_emailAddress_key" ON "EmailAccount"("userId", "emailAddress");
