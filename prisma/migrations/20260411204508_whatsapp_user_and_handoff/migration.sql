-- CreateTable
CREATE TABLE "LeadHandoffRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "contactId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "toUserId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "reviewNote" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" DATETIME,
    "requesterId" TEXT NOT NULL,
    "reviewerId" TEXT,
    CONSTRAINT "LeadHandoffRequest_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "LeadHandoffRequest_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_WhatsAppMessage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "direction" TEXT NOT NULL DEFAULT 'outbound',
    "phone" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "mediaUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'sent',
    "waMessageId" TEXT,
    "sentAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "contactId" TEXT NOT NULL,
    "userId" TEXT,
    "templateId" TEXT,
    "followUpExecId" TEXT,
    CONSTRAINT "WhatsAppMessage_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "WhatsAppMessage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "WhatsAppMessage_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "MessageTemplate" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "WhatsAppMessage_followUpExecId_fkey" FOREIGN KEY ("followUpExecId") REFERENCES "FollowUpExecution" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_WhatsAppMessage" ("contactId", "content", "createdAt", "direction", "followUpExecId", "id", "mediaUrl", "phone", "sentAt", "status", "templateId", "waMessageId") SELECT "contactId", "content", "createdAt", "direction", "followUpExecId", "id", "mediaUrl", "phone", "sentAt", "status", "templateId", "waMessageId" FROM "WhatsAppMessage";
DROP TABLE "WhatsAppMessage";
ALTER TABLE "new_WhatsAppMessage" RENAME TO "WhatsAppMessage";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
