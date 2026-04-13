/**
 * Lightweight CSV parser that supports:
 * - Quoted fields with commas inside ("Acme, Inc")
 * - Escaped quotes inside quoted fields ("She said ""hi""")
 * - Mixed line endings (\r\n, \n)
 * - Trimmed headers, case-insensitive header matching
 *
 * Returns an array of row objects keyed by header.
 */

export function parseCSV(text: string): Record<string, string>[] {
  const rows = parseCSVRows(text);
  if (rows.length === 0) return [];

  const headers = rows[0].map((h) => h.trim().toLowerCase().replace(/[\s_-]+/g, ""));
  const dataRows = rows.slice(1);

  return dataRows
    .filter((row) => row.some((cell) => cell.trim().length > 0)) // skip empty rows
    .map((row) => {
      const obj: Record<string, string> = {};
      headers.forEach((header, i) => {
        obj[header] = (row[i] ?? "").trim();
      });
      return obj;
    });
}

/**
 * Parse CSV text into a 2D array of strings, handling quoted fields properly.
 */
function parseCSVRows(text: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = "";
  let inQuotes = false;
  let i = 0;

  while (i < text.length) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (inQuotes) {
      if (char === '"' && nextChar === '"') {
        // Escaped quote
        currentField += '"';
        i += 2;
        continue;
      }
      if (char === '"') {
        // End of quoted field
        inQuotes = false;
        i++;
        continue;
      }
      currentField += char;
      i++;
      continue;
    }

    // Not in quotes
    if (char === '"') {
      inQuotes = true;
      i++;
      continue;
    }

    if (char === ",") {
      currentRow.push(currentField);
      currentField = "";
      i++;
      continue;
    }

    if (char === "\n" || char === "\r") {
      currentRow.push(currentField);
      rows.push(currentRow);
      currentRow = [];
      currentField = "";
      // Skip \r\n combo
      if (char === "\r" && nextChar === "\n") i += 2;
      else i++;
      continue;
    }

    currentField += char;
    i++;
  }

  // Flush any remaining field/row
  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField);
    rows.push(currentRow);
  }

  return rows;
}

/**
 * Map a generic CSV row to a Contact-like object.
 * Tries multiple common header variations.
 */
export function mapContactRow(row: Record<string, string>) {
  const get = (...keys: string[]) => {
    for (const k of keys) {
      const normalized = k.toLowerCase().replace(/[\s_-]+/g, "");
      if (row[normalized] !== undefined && row[normalized] !== "") return row[normalized];
    }
    return null;
  };

  const name = get("name", "fullname", "contactname", "firstname");
  const lastName = get("lastname", "surname");
  const fullName = name && lastName ? `${name} ${lastName}` : name;

  const email = get("email", "emailaddress", "mail", "workemail");
  if (!email) return null;

  return {
    name: fullName || email.split("@")[0],
    email: email.toLowerCase(),
    phone: get("phone", "phonenumber", "mobile", "contactnumber"),
    whatsappPhone: get("whatsapp", "whatsappnumber", "whatsappphone"),
    company: get("company", "organization", "companyname", "organisation"),
    status: get("status") || "lead",
    source: get("source", "leadsource"),
    notes: get("notes", "comments", "description"),
    tags: get("tags", "tag"),
  };
}
