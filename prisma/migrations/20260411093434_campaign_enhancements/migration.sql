-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Campaign" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'email',
    "status" TEXT NOT NULL DEFAULT 'draft',
    "subject" TEXT,
    "subjectB" TEXT,
    "content" TEXT,
    "audienceFilter" TEXT,
    "scheduledFor" DATETIME,
    "sentAt" DATETIME,
    "sentCount" INTEGER NOT NULL DEFAULT 0,
    "openCount" INTEGER NOT NULL DEFAULT 0,
    "clickCount" INTEGER NOT NULL DEFAULT 0,
    "openRate" REAL NOT NULL DEFAULT 0,
    "clickRate" REAL NOT NULL DEFAULT 0,
    "abTestEnabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Campaign" ("audienceFilter", "clickRate", "content", "createdAt", "id", "name", "openRate", "sentCount", "status", "subject", "type", "updatedAt") SELECT "audienceFilter", "clickRate", "content", "createdAt", "id", "name", "openRate", "sentCount", "status", "subject", "type", "updatedAt" FROM "Campaign";
DROP TABLE "Campaign";
ALTER TABLE "new_Campaign" RENAME TO "Campaign";
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
    "templateId" TEXT,
    "followUpExecId" TEXT,
    "campaignId" TEXT,
    CONSTRAINT "EmailMessage_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "EmailMessage_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "MessageTemplate" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "EmailMessage_followUpExecId_fkey" FOREIGN KEY ("followUpExecId") REFERENCES "FollowUpExecution" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "EmailMessage_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_EmailMessage" ("aiClassification", "aiReplied", "aiSummary", "body", "ccAddr", "contactId", "createdAt", "direction", "followUpExecId", "fromAddr", "id", "inReplyTo", "messageId", "openedAt", "sentAt", "status", "subject", "templateId", "toAddr") SELECT "aiClassification", "aiReplied", "aiSummary", "body", "ccAddr", "contactId", "createdAt", "direction", "followUpExecId", "fromAddr", "id", "inReplyTo", "messageId", "openedAt", "sentAt", "status", "subject", "templateId", "toAddr" FROM "EmailMessage";
DROP TABLE "EmailMessage";
ALTER TABLE "new_EmailMessage" RENAME TO "EmailMessage";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
