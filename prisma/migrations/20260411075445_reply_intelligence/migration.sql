-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
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
    CONSTRAINT "EmailMessage_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "EmailMessage_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "MessageTemplate" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "EmailMessage_followUpExecId_fkey" FOREIGN KEY ("followUpExecId") REFERENCES "FollowUpExecution" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_EmailMessage" ("body", "contactId", "createdAt", "direction", "followUpExecId", "fromAddr", "id", "inReplyTo", "messageId", "openedAt", "sentAt", "status", "subject", "templateId", "toAddr") SELECT "body", "contactId", "createdAt", "direction", "followUpExecId", "fromAddr", "id", "inReplyTo", "messageId", "openedAt", "sentAt", "status", "subject", "templateId", "toAddr" FROM "EmailMessage";
DROP TABLE "EmailMessage";
ALTER TABLE "new_EmailMessage" RENAME TO "EmailMessage";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
