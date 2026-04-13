-- CreateTable
CREATE TABLE "SalesTarget" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "period" TEXT NOT NULL DEFAULT 'monthly',
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME NOT NULL,
    "targetAmount" REAL NOT NULL,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "ownerId" TEXT,
    CONSTRAINT "SalesTarget_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Deal" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "value" REAL NOT NULL DEFAULT 0,
    "stage" TEXT NOT NULL DEFAULT 'lead',
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
INSERT INTO "new_Deal" ("contactId", "createdAt", "expectedCloseDate", "id", "notes", "probability", "stage", "title", "updatedAt", "value") SELECT "contactId", "createdAt", "expectedCloseDate", "id", "notes", "probability", "stage", "title", "updatedAt", "value" FROM "Deal";
DROP TABLE "Deal";
ALTER TABLE "new_Deal" RENAME TO "Deal";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
