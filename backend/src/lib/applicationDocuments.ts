export type ApplicationFormDocument = {
  name: string;
  description: string;
  mandatory: boolean;
  acceptedFormats: string;
};

const DEFAULT_APPLICATION_DOCUMENTS: ApplicationFormDocument[] = [
  {
    name: 'Birth Certificate',
    description: 'Official birth certificate of the student',
    mandatory: true,
    acceptedFormats: 'PDF, JPG, PNG',
  },
  {
    name: 'Previous Marksheet',
    description: 'Latest academic marksheet or report card',
    mandatory: true,
    acceptedFormats: 'PDF, JPG, PNG',
  },
  {
    name: 'Address Proof',
    description: 'Aadhaar, utility bill, or ration card',
    mandatory: false,
    acceptedFormats: 'PDF, JPG, PNG',
  },
];

function parseJsonRows(raw: string | undefined): Record<string, string>[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((row) => row && typeof row === 'object')
      .map((row) => {
        const out: Record<string, string> = {};
        for (const [k, v] of Object.entries(row as Record<string, unknown>)) {
          out[k] = v == null ? '' : String(v);
        }
        return out;
      });
  } catch {
    return [];
  }
}

function rowToDocument(row: Record<string, string>): ApplicationFormDocument | null {
  const name = (row.name || '').trim();
  if (!name) return null;
  if ((row.active || 'Yes').toLowerCase() === 'no') return null;
  return {
    name,
    description: (row.description || '').trim(),
    mandatory: (row.mandatory || 'No').toLowerCase() === 'yes',
    acceptedFormats: (row.acceptedFormats || 'PDF, JPG, PNG').trim(),
  };
}

export function parseApplicationFormDocuments(documentSetup: unknown): ApplicationFormDocument[] {
  const tile = (documentSetup || {}) as {
    sections?: Record<string, Record<string, string>>;
  };
  const sections = tile.sections || {};

  const fromAppSection = parseJsonRows(sections['Application Form Documents']?.applicationDocuments)
    .map(rowToDocument)
    .filter((d): d is ApplicationFormDocument => d != null);

  const fromRequired = parseJsonRows(sections['Required Documents']?.documents)
    .filter((row) => {
      const rf = (row.requiredFor || 'Admission').toLowerCase();
      return rf === 'admission' || rf === 'both';
    })
    .map(rowToDocument)
    .filter((d): d is ApplicationFormDocument => d != null);

  const configured = fromAppSection.length > 0 ? fromAppSection : fromRequired;

  const byName = new Map<string, ApplicationFormDocument>();
  for (const doc of DEFAULT_APPLICATION_DOCUMENTS) {
    byName.set(doc.name.toLowerCase(), doc);
  }
  for (const doc of configured) {
    byName.set(doc.name.toLowerCase(), doc);
  }

  return [...byName.values()];
}

export function isKnownDocumentType(name: string): boolean {
  const normalized = name.trim().toLowerCase();
  return DEFAULT_APPLICATION_DOCUMENTS.some((d) => d.name.toLowerCase() === normalized);
}
