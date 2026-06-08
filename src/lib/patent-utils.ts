/**
 * Patent parsing utilities for extracting structured data from patent content.
 *
 * These helpers are jurisdiction-aware (US + EPO + other WIPO ST.3 offices) and
 * pure/deterministic - they perform no network or secret access, so they are
 * safe to unit-test in a public repo.
 */

export interface PatentMetadata {
  patentNumber?: string;
  country?: string;        // WIPO ST.3 / ISO-3166 office code: 'US' | 'EP' | 'WO' | 'CN' | ...
  kindCode?: string;       // WIPO ST.16 kind code: 'A1' | 'B1' | 'B2' | 'S' | ...
  publicationDate?: string;
  applicationNumber?: string;
  filingDate?: string;
  priorityDate?: string;
  assignees?: Array<{ name: string; location?: string }>;
  claimsCount?: number;
  inventors?: string[];
  ipc?: string[];
  cpc?: string[];
}

export interface PatentFigure {
  /** Human label, e.g. "FIG. 1" or the source filename. */
  label?: string;
  /** Resolvable image URL (signed GCS URL from the API, or an absolute markdown image). */
  url: string;
  /** Short alt text for accessibility. */
  alt?: string;
}

/**
 * Canonical patent reference matcher: {CC}{digits}{kindCode}.
 * Jurisdiction is detected SOLELY from the leading two-letter country code,
 * never inferred from number length. US alpha prefixes (RE/PP/D/H) are
 * preserved so a design patent (D) is never mangled into a utility number.
 */
const PATENT_NUM_RE = /\b([A-Z]{2})\s*((?:RE|PP|D|H)?\d[\d,]{2,})\s*([A-Z]\d?)?\b/;

/** WIPO ST.16 / office logo + flag metadata, used for jurisdiction-aware UI. */
export const PATENT_OFFICES = {
  US: { label: 'USPTO', name: 'United States Patent and Trademark Office', logo: '/assets/banner/uspto.png', flag: '🇺🇸' },
  EP: { label: 'EPO', name: 'European Patent Office', logo: '/assets/banner/epo.svg', flag: '🇪🇺' },
  WO: { label: 'WIPO', name: 'World Intellectual Property Organization', logo: '/assets/banner/wipo.svg', flag: '🌐' },
} as const;

export type PatentOfficeCode = keyof typeof PATENT_OFFICES;

/** Resolve office presentation metadata from a country code (defaults to US). */
export function getOffice(country?: string) {
  const code = (country || '').toUpperCase() as PatentOfficeCode;
  return PATENT_OFFICES[code] ?? PATENT_OFFICES.US;
}

/**
 * Parse a raw patent reference string into {country, number, kindCode}.
 * Returns an empty object when no recognizable reference is present.
 */
export function parsePatentReference(raw: string): { country?: string; number?: string; kindCode?: string } {
  if (!raw) return {};
  const m = raw.match(PATENT_NUM_RE);
  if (!m) return {};
  return {
    country: m[1].toUpperCase(),
    number: m[2].replace(/,/g, ''),
    kindCode: m[3]?.toUpperCase(),
  };
}

/**
 * Derive a document TYPE strictly from the parsed kind code (research-grade).
 * A WO/PCT publication is NEVER a granted patent - the PCT system has no grant.
 * Where the kind code is unknown, returns 'unknown' rather than guessing.
 */
export function getStatusFromKindCode(
  country?: string,
  kindCode?: string
): 'application' | 'granted' | 'reexam' | 'reissue' | 'design' | 'plant' | 'international' | 'unknown' {
  const cc = (country || '').toUpperCase();
  const k = (kindCode || '').toUpperCase();

  if (cc === 'WO') return 'international';
  if (!k) return 'unknown';

  const letter = k[0];
  switch (letter) {
    case 'A':
      // US/EP application publications (A1/A2/A3/A9). EP also uses A4 (suppl. search report).
      return 'application';
    case 'B':
      // US B1/B2 grant; EP B1/B2/B3 granted specification.
      return 'granted';
    case 'C':
      return 'reexam';
    case 'E':
      return 'reissue';
    case 'S':
      return 'design'; // US design patent
    case 'P':
      return 'plant'; // US plant (P2/P3 grant)
    default:
      return 'unknown';
  }
}

/**
 * Plain-language explanation of a WIPO ST.16 kind code for a given office.
 * Surfaced as a tooltip - the kind code is the single biggest credibility
 * signal to a patent professional, and most lay users don't know what it means.
 */
export function getKindCodeExplanation(country?: string, kindCode?: string): string | undefined {
  const k = (kindCode || '').toUpperCase();
  if (!k) return undefined;
  const cc = (country || '').toUpperCase();

  if (cc === 'WO') {
    return 'WIPO/PCT international application (not a granted patent - grant happens later in national phase).';
  }

  const map: Record<string, string> = {
    A1: cc === 'EP'
      ? 'European application published with the search report.'
      : 'Pre-grant application publication.',
    A2: cc === 'EP'
      ? 'European application published without the search report.'
      : 'Application publication (republication).',
    A3: 'Separately published search report.',
    A9: 'Corrected application publication.',
    B1: cc === 'EP'
      ? 'Granted European patent specification.'
      : 'Granted patent (no prior application publication).',
    B2: cc === 'EP'
      ? 'Amended European specification after opposition/limitation.'
      : 'Granted patent (application was previously published).',
    B3: 'European specification after limitation procedure.',
    C1: 'Reexamination certificate.',
    E: 'Reissued patent.',
    S: 'Design patent.',
    P2: 'Granted plant patent.',
    P3: 'Granted plant patent (previously published).',
  };
  return map[k] || `Kind code ${k}.`;
}

/** Human label for a kind-code-derived status. */
export function getStatusLabel(status: ReturnType<typeof getStatusFromKindCode>): string {
  switch (status) {
    case 'application': return 'Application';
    case 'granted': return 'Granted';
    case 'reexam': return 'Reexamination';
    case 'reissue': return 'Reissue';
    case 'design': return 'Design';
    case 'plant': return 'Plant';
    case 'international': return 'International application';
    default: return 'Patent';
  }
}

/** Group US-style utility digits with thousands separators for display. */
function groupDigits(number: string): string {
  // Preserve alpha prefixes (RE/PP/D/H); only group the trailing digit run.
  const m = number.match(/^([A-Z]*)(\d+)$/i);
  if (!m) return number;
  return m[1] + Number(m[2]).toLocaleString('en-US');
}

export interface PatentDisplay {
  country: string;
  number: string;
  kindCode?: string;
  /** Canonical ST.16 triplet, e.g. "US 7,654,321 B2" or "EP 4,181,262 A1". */
  formatted: string;
  office: ReturnType<typeof getOffice>;
  status: ReturnType<typeof getStatusFromKindCode>;
  statusLabel: string;
}

/**
 * Build a jurisdiction-aware display identity from API metadata (snake_case
 * fields from the Valyu API) and/or the markdown content. Prefers explicit
 * country/kind_code fields, then a CC-prefixed patent number, then content,
 * finally defaulting the office to US (the historical behavior).
 */
export function getPatentDisplay(
  metadata?: {
    patent_number?: string;
    patentNumber?: string;
    country?: string;
    kind_code?: string;
    kindCode?: string;
  } | null,
  content?: string
): PatentDisplay {
  const rawNumber = metadata?.patentNumber || metadata?.patent_number || '';

  // 1) A CC-prefixed number (e.g. EPO "EP4181262A1") is fully self-describing.
  const fromNumber = parsePatentReference(rawNumber);

  // 2) Content-embedded reference (US content carries "**Patent Number:** US 1234567 B2").
  const fromContent = content ? parsePatentReference(content) : {};

  const country = (
    metadata?.country ||
    fromNumber.country ||
    fromContent.country ||
    'US'
  ).toUpperCase();

  const kindCode =
    metadata?.kind_code ||
    metadata?.kindCode ||
    fromNumber.kindCode ||
    fromContent.kindCode;

  // The bare numeric portion (strip a leading CC and trailing kind code if present).
  let number = fromNumber.number || rawNumber || fromContent.number || '';
  number = number.replace(/,/g, '').trim();

  const office = getOffice(country);
  const status = getStatusFromKindCode(country, kindCode);
  const display = number ? `${country} ${groupDigits(number)}` : country;
  const formatted = kindCode ? `${display} ${kindCode}` : display;

  return { country, number, kindCode, formatted, office, status, statusLabel: getStatusLabel(status) };
}

/** Normalize a date-ish string to ISO YYYY-MM-DD where possible. */
function normalizeDate(raw?: string): string | undefined {
  if (!raw) return undefined;
  const trimmed = raw.trim();
  // Already ISO-ish.
  const iso = trimmed.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (iso) {
    return `${iso[1]}-${iso[2].padStart(2, '0')}-${iso[3].padStart(2, '0')}`;
  }
  const parsed = new Date(trimmed);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }
  return trimmed;
}

/**
 * Intelligently extract the abstract from patent content.
 * Stops at the end of the Abstract section, not mid-sentence.
 */
export function extractPatentAbstract(content: string): string {
  if (!content) return '';
  // Try to find the Abstract section with various patterns.
  // Section bodies are matched with \n+ (not \n\n) so EPO single-newline
  // spacing still parses.
  const abstractPatterns = [
    /##\s*Abstract\s*\n+([\s\S]*?)(?=\n##|$)/i,
    /Abstract:\s*\n+([\s\S]*?)(?=\n##|$)/i,
    /ABSTRACT\s*\n+([\s\S]*?)(?=\n##|DESCRIPTION|CLAIMS|BACKGROUND|$)/i,
  ];

  for (const pattern of abstractPatterns) {
    const match = content.match(pattern);
    if (match && match[1]) {
      const abstract = match[1].trim();
      if (abstract.length > 50) {
        return abstract;
      }
    }
  }

  // Fallback: Look for content between title and Description section.
  const fallbackPattern = /(?:##\s*[\w\s-]+\n+)+([\s\S]{100,1000}?)(?=\n##\s*Description|$)/i;
  const fallbackMatch = content.match(fallbackPattern);
  if (fallbackMatch && fallbackMatch[1]) {
    return fallbackMatch[1].trim();
  }

  // Last resort: take first 400 characters after the patent number/title.
  const lines = content.split('\n');
  let startCollecting = false;
  let collected = '';

  for (const line of lines) {
    if (line.startsWith('#') && line.includes('Patent')) continue;
    if (line.startsWith('**Patent Number')) continue;
    if (line.startsWith('**Publication Date')) continue;
    if (line.startsWith('**Application Number')) continue;
    if (line.startsWith('**Filing Date')) continue;
    if (line.includes('## Abstract')) {
      startCollecting = true;
      continue;
    }
    if (line.startsWith('## Description') || line.startsWith('## Claims')) break;

    if (startCollecting && line.trim()) {
      collected += line + ' ';
      if (collected.length > 400) break;
    }
  }

  return collected.trim() || content.substring(0, 400).trim() + '...';
}

/**
 * Extract structured metadata from patent content.
 *
 * NOTE: the Valyu API also returns a structured `metadata` object directly;
 * prefer that where present and use this content parser as a fallback for
 * fields the API omits. Label matching is jurisdiction-tolerant (US bold
 * labels + EPO synonyms).
 */
export function parsePatentMetadata(content: string): PatentMetadata {
  const metadata: PatentMetadata = {};
  if (!content) return metadata;

  // Patent number + jurisdiction (CC-generic, not US-only).
  const labelled = content.match(/\*\*Patent Number:?\*\*\s*([A-Z]{2}\s*(?:RE|PP|D|H)?[\d,]+\s*[A-Z]?\d?)/i);
  const ref = parsePatentReference(labelled?.[1] || content);
  if (ref.country) {
    metadata.country = ref.country;
    metadata.kindCode = ref.kindCode;
    metadata.patentNumber = `${ref.country} ${ref.number}${ref.kindCode ? ' ' + ref.kindCode : ''}`;
  }

  // Publication date (US: "Publication Date"; EPO: "Date of publication" / "Published").
  const pub = content.match(/\*{0,2}(?:Publication Date|Date of publication|Published):?\*{0,2}\s*([\d./-]+)/i);
  if (pub) metadata.publicationDate = normalizeDate(pub[1]);

  // Application number (US: "Application Number"; EPO: "Application No").
  const app = content.match(/\*{0,2}(?:Application Number|Application No\.?|Filing No\.?):?\*{0,2}\s*([\d,/.]+)/i);
  if (app) metadata.applicationNumber = app[1].replace(/,/g, '');

  // Filing date (US: "Filing Date"; EPO: "Date of filing").
  const filing = content.match(/\*{0,2}(?:Filing Date|Date of filing):?\*{0,2}\s*([\d./-]+)/i);
  if (filing) metadata.filingDate = normalizeDate(filing[1]);

  // Priority date.
  const priority = content.match(/\*{0,2}(?:Priority Date|Earliest Priority):?\*{0,2}\s*([\d./-]+)/i);
  if (priority) metadata.priorityDate = normalizeDate(priority[1]);

  // Assignees.
  const assigneesMatch = content.match(/###\s*Assignees\s*\n([\s\S]*?)(?=\n#{1,3}|$)/i);
  if (assigneesMatch) {
    const assigneeLines = assigneesMatch[1].trim().split('\n');
    metadata.assignees = assigneeLines
      .filter(line => line.trim().startsWith('-'))
      .map(line => {
        const cleanLine = line.replace(/^-\s*\*\*/, '').replace(/\*\*/, '');
        const locationMatch = cleanLine.match(/\(([^)]+)\)/);
        return {
          name: cleanLine.replace(/\([^)]+\)/, '').trim(),
          location: locationMatch ? locationMatch[1] : undefined,
        };
      });
  }

  // Number of claims (explicit label, else count "N." claim openers in the claims section).
  const claimsMatch = content.match(/\*{0,2}Number of Claims:?\*{0,2}\s*(\d+)/i);
  if (claimsMatch) {
    metadata.claimsCount = parseInt(claimsMatch[1], 10);
  } else {
    const claimsSection = content.match(/##\s*Claims?\s*\n+([\s\S]*?)(?=\n##|$)/i);
    if (claimsSection) {
      const openers = claimsSection[1].match(/^\s*\d+\.\s/gm);
      if (openers?.length) metadata.claimsCount = openers.length;
    }
  }

  // Classifications (IPC and CPC kept separate - they are NOT interchangeable).
  const { ipc, cpc } = extractClassifications(content);
  if (ipc.length) metadata.ipc = ipc;
  if (cpc.length) metadata.cpc = cpc;

  return metadata;
}

/**
 * Extract IPC and CPC classification symbols from content, preserving valid
 * notation (space after subclass, slash before subgroup, e.g. "A01B 1/00").
 * IPC and CPC are returned in separate arrays - a CPC symbol may not exist in
 * IPC and vice versa.
 */
export function extractClassifications(content: string): { ipc: string[]; cpc: string[] } {
  const symbolRe = /\b([A-HY]\d{2}[A-Z]\s?\d{1,4}\/\d{2,})\b/g;
  const normalize = (s: string) => s.replace(/\s+/g, ' ').toUpperCase().trim();

  const pick = (labelRe: RegExp): string[] => {
    const block = content.match(labelRe);
    if (!block) return [];
    const found = block[1].match(symbolRe) || [];
    return [...new Set(found.map(normalize))];
  };

  const ipc = pick(/(?:IPC|International Patent Classification)[:\s)]*([\s\S]{0,400}?)(?=\n##|\n\n|CPC|$)/i);
  const cpc = pick(/(?:CPC|Cooperative Patent Classification)[:\s)]*([\s\S]{0,400}?)(?=\n##|\n\n|IPC|$)/i);
  return { ipc, cpc };
}

/**
 * Extract patent figures, preferring the API-provided signed image URL map
 * (filename -> URL) and falling back to absolute markdown image references in
 * the content. Relative refs (e.g. "imgaf001.tif") are dropped - they are not
 * browser-resolvable.
 */
export function extractPatentFigures(
  content?: string,
  imageUrls?: Record<string, string> | null
): PatentFigure[] {
  const figures: PatentFigure[] = [];
  const seen = new Set<string>();

  // Derive a "FIG. N" label from a filename like "US12519129-img-3.png".
  const labelFromName = (name: string): string | undefined => {
    const m = name.match(/img[-_]?(\d+)/i);
    return m ? `FIG. ${parseInt(m[1], 10)}` : undefined;
  };

  if (imageUrls && typeof imageUrls === 'object') {
    for (const [name, url] of Object.entries(imageUrls)) {
      if (typeof url !== 'string' || !/^https?:\/\//i.test(url) || seen.has(url)) continue;
      seen.add(url);
      figures.push({ url, label: labelFromName(name), alt: name });
    }
  }

  if (content) {
    const mdImg = /!\[([^\]]*)\]\((https?:\/\/[^)\s]+)\)/g;
    let m: RegExpExecArray | null;
    while ((m = mdImg.exec(content)) !== null) {
      const url = m[2];
      if (seen.has(url)) continue;
      seen.add(url);
      figures.push({ url, alt: m[1] || undefined, label: m[1] || undefined });
    }
  }

  return figures;
}

/**
 * Parse patent content into structured sections.
 */
export interface PatentSections {
  abstract?: string;
  claims?: string;
  description?: string;
  citations?: string;
  drawings?: string;
}

export function parsePatentSections(
  content: string,
  requestedSections?: Array<'abstract' | 'claims' | 'description' | 'citations' | 'drawings' | 'all'>
): PatentSections {
  const sections: PatentSections = {};
  if (!content) return sections;
  const wantAll = !requestedSections || requestedSections.includes('all');

  // Section bodies matched with \n+ so EPO single-newline spacing still parses.
  if (wantAll || requestedSections?.includes('abstract')) {
    sections.abstract = extractPatentAbstract(content);
  }

  if (wantAll || requestedSections?.includes('claims')) {
    const claimsMatch = content.match(/##\s*Claims?\s*\n+([\s\S]*?)(?=\n##|$)/i);
    if (claimsMatch) sections.claims = claimsMatch[1].trim();
    else if (!wantAll) console.warn('[parsePatentSections] no claims section matched');
  }

  if (wantAll || requestedSections?.includes('description')) {
    const descriptionPatterns = [
      /##\s*Description\s*\n+([\s\S]*?)(?=\n##\s*Claims|$)/i,
      /##\s*Detailed Description\s*\n+([\s\S]*?)(?=\n##|$)/i,
    ];
    for (const pattern of descriptionPatterns) {
      const match = content.match(pattern);
      if (match) {
        sections.description = match[1].trim();
        break;
      }
    }
  }

  if (wantAll || requestedSections?.includes('drawings')) {
    const drawingsMatch = content.match(/##\s*(?:Description of Drawings|Brief Description of (?:the )?Drawings)\s*\n+([\s\S]*?)(?=\n##|$)/i);
    if (drawingsMatch) sections.drawings = drawingsMatch[1].trim();
  }

  if (wantAll || requestedSections?.includes('citations')) {
    const citationsMatch = content.match(/##\s*(?:Citations?|References Cited).*?\n+([\s\S]*?)(?=\n##|$)/i);
    if (citationsMatch) sections.citations = citationsMatch[1].trim();
  }

  return sections;
}

/**
 * Extract a canonical patent number ("US 12519129 B2", "EP 4181262 A1") from
 * content, jurisdiction-agnostic. Returns 'Unknown' only when no CC-prefixed
 * reference is present anywhere.
 */
export function extractPatentNumber(content: string, fallbackTitle?: string): string {
  const canonical = (ref: ReturnType<typeof parsePatentReference>) =>
    `${ref.country} ${ref.number}${ref.kindCode ? ' ' + ref.kindCode : ''}`;

  // Structured label first.
  const structured = content.match(/\*\*Patent Number:?\*\*\s*([A-Z]{2}\s*(?:RE|PP|D|H)?[\d,]+\s*[A-Z]?\d?)/i);
  if (structured) {
    const ref = parsePatentReference(structured[1]);
    if (ref.country) return canonical(ref);
  }

  // Anywhere in the content.
  const inline = parsePatentReference(content);
  if (inline.country) return canonical(inline);

  // Title fallback.
  if (fallbackTitle) {
    const ref = parsePatentReference(fallbackTitle);
    if (ref.country) return canonical(ref);
  }

  return 'Unknown';
}
