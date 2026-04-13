-- CreateTable
CREATE TABLE "LeadRoutingRule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "sourcePattern" TEXT,
    "domainPattern" TEXT,
    "tagPattern" TEXT,
    "assignToUserId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "priority" INTEGER NOT NULL DEFAULT 100,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Deal" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "value" REAL NOT NULL DEFAULT 0,
    "stage" TEXT NOT NULL DEFAULT 'lead',
    "stageChangedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "probability" INTEGER NOT NULL DEFAULT 0,
    "expectedCloseDate" DATETIME,
    "notes" TEXT,
    "source" TEXT,
    "lossReason" TEXT,
    "wonAt" DATETIME,
    "lostAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "contactId" TEXT NOT NULL,
    "ownerId" TEXT,
    "campaignId" TEXT,
    CONSTRAINT "Deal_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Deal_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Deal_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Deal" ("campaignId", "contactId", "createdAt", "expectedCloseDate", "id", "lossReason", "lostAt", "notes", "ownerId", "probability", "source", "stage", "title", "updatedAt", "value", "wonAt") SELECT "campaignId", "contactId", "createdAt", "expectedCloseDate", "id", "lossReason", "lostAt", "notes", "ownerId", "probability", "source", "stage", "title", "updatedAt", "value", "wonAt" FROM "Deal";
DROP TABLE "Deal";
ALTER TABLE "new_Deal" RENAME TO "Deal";
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "password" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'admin',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "outOfOffice" BOOLEAN NOT NULL DEFAULT false,
    "outOfOfficeUntil" DATETIME,
    "backupUserId" TEXT,
    CONSTRAINT "User_backupUserId_fkey" FOREIGN KEY ("backupUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_User" ("createdAt", "email", "id", "isActive", "lastLoginAt", "name", "password", "phone", "role") SELECT "createdAt", "email", "id", "isActive", "lastLoginAt", "name", "password", "phone", "role" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
