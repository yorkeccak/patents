import { describe, it, expect } from 'vitest';
import {
  parsePatentReference,
  extractPatentNumber,
  getOffice,
  getStatusFromKindCode,
  getPatentDisplay,
  parsePatentMetadata,
  extractClassifications,
  extractPatentFigures,
  extractPatentAbstract,
  parsePatentSections,
  getKindCodeExplanation,
} from './patent-utils';

describe('parsePatentReference', () => {
  it('parses a US grant with kind code', () => {
    expect(parsePatentReference('US 7,654,321 B2')).toEqual({ country: 'US', number: '7654321', kindCode: 'B2' });
  });
  it('parses a concatenated EPO number', () => {
    expect(parsePatentReference('EP4181262A1')).toEqual({ country: 'EP', number: '4181262', kindCode: 'A1' });
  });
  it('parses a WO/PCT publication', () => {
    expect(parsePatentReference('WO2020123456A1')).toMatchObject({ country: 'WO', kindCode: 'A1' });
  });
  it('preserves US design (D) prefix - never mangled into a utility number', () => {
    expect(parsePatentReference('USD123456S')).toMatchObject({ country: 'US', number: 'D123456' });
  });
  it('preserves US reissue (RE) prefix', () => {
    expect(parsePatentReference('US RE40000 E')).toMatchObject({ country: 'US', number: 'RE40000' });
  });
  it('returns empty for a bare number with no country code', () => {
    expect(parsePatentReference('12519129')).toEqual({});
  });
});

describe('extractPatentNumber', () => {
  it('extracts a labelled US number from content', () => {
    expect(extractPatentNumber('**Patent Number:** US 12519129 B2\n\n## Abstract')).toBe('US 12519129 B2');
  });
  it('extracts an EPO number embedded in text', () => {
    expect(extractPatentNumber('European patent EP4181262A1 relates to...')).toBe('EP 4181262 A1');
  });
  it('returns Unknown when no jurisdiction-prefixed reference exists', () => {
    expect(extractPatentNumber('A solid state battery with no number here')).toBe('Unknown');
  });
});

describe('getOffice', () => {
  it('maps known offices', () => {
    expect(getOffice('US').label).toBe('USPTO');
    expect(getOffice('EP').label).toBe('EPO');
    expect(getOffice('WO').label).toBe('WIPO');
  });
  it('defaults unknown/empty country to USPTO', () => {
    expect(getOffice(undefined).label).toBe('USPTO');
    expect(getOffice('ZZ').label).toBe('USPTO');
  });
});

describe('getStatusFromKindCode', () => {
  it('treats A-series as applications and B-series as granted', () => {
    expect(getStatusFromKindCode('US', 'A1')).toBe('application');
    expect(getStatusFromKindCode('US', 'B2')).toBe('granted');
    expect(getStatusFromKindCode('EP', 'B1')).toBe('granted');
  });
  it('always treats WO as international (never granted)', () => {
    expect(getStatusFromKindCode('WO', 'A1')).toBe('international');
  });
  it('classifies US design/plant/reissue/reexam', () => {
    expect(getStatusFromKindCode('US', 'S')).toBe('design');
    expect(getStatusFromKindCode('US', 'P2')).toBe('plant');
    expect(getStatusFromKindCode('US', 'E')).toBe('reissue');
    expect(getStatusFromKindCode('US', 'C1')).toBe('reexam');
  });
  it('returns unknown without a kind code', () => {
    expect(getStatusFromKindCode('US', undefined)).toBe('unknown');
  });
});

describe('getPatentDisplay', () => {
  it('formats a US grant with grouped digits from API metadata + content kind', () => {
    const d = getPatentDisplay({ patent_number: '12519129' }, '**Patent Number:** US 12519129 B2');
    expect(d.country).toBe('US');
    expect(d.formatted).toBe('US 12,519,129 B2');
    expect(d.office.label).toBe('USPTO');
    expect(d.status).toBe('granted');
  });
  it('formats an EPO application from the structured number', () => {
    const d = getPatentDisplay({ patent_number: 'EP4181262A1', country: 'EP', kind_code: 'A1' });
    expect(d.country).toBe('EP');
    expect(d.formatted).toBe('EP 4,181,262 A1');
    expect(d.office.label).toBe('EPO');
    expect(d.statusLabel).toBe('Application');
  });
  it('defaults the office to US when nothing identifies a jurisdiction', () => {
    expect(getPatentDisplay({ patent_number: '12519129' }).office.label).toBe('USPTO');
  });
});

describe('parsePatentMetadata', () => {
  it('parses US bold-label metadata', () => {
    const md = parsePatentMetadata(
      '**Patent Number:** US 12519129 B2\n**Filing Date:** 2022-02-10\n**Publication Date:** 2026-01-06\n**Number of Claims:** 7'
    );
    expect(md.country).toBe('US');
    expect(md.filingDate).toBe('2022-02-10');
    expect(md.claimsCount).toBe(7);
  });
  it('parses EPO label synonyms and normalizes dates to ISO', () => {
    const md = parsePatentMetadata(
      'Patent Number: EP4181262A1\nDate of filing: 2021/10/14\nDate of publication: 2023/05/17'
    );
    expect(md.country).toBe('EP');
    expect(md.filingDate).toBe('2021-10-14');
    expect(md.publicationDate).toBe('2023-05-17');
  });
  it('falls back to counting claim openers when no explicit count', () => {
    const md = parsePatentMetadata('## Claims\n1. A device.\n2. The device of claim 1.\n3. The device of claim 2.');
    expect(md.claimsCount).toBe(3);
  });
});

describe('extractClassifications', () => {
  it('separates IPC and CPC symbols in valid notation', () => {
    const { ipc, cpc } = extractClassifications('IPC: H01M 10/0562\nCPC: Y02E 60/10');
    expect(ipc).toContain('H01M 10/0562');
    expect(cpc).toContain('Y02E 60/10');
  });
});

describe('extractPatentFigures', () => {
  it('builds figures from the API signed-url map with FIG labels', () => {
    const figs = extractPatentFigures(undefined, {
      'US12519129-img-1.png': 'https://example.com/a.png',
      'US12519129-img-2.png': 'https://example.com/b.png',
    });
    expect(figs).toHaveLength(2);
    expect(figs[0]).toMatchObject({ url: 'https://example.com/a.png', label: 'FIG. 1' });
  });
  it('extracts absolute markdown images and drops relative .tif refs', () => {
    const figs = extractPatentFigures('![drawing](imgaf001.tif) and ![real](https://x.com/c.png)');
    expect(figs).toHaveLength(1);
    expect(figs[0].url).toBe('https://x.com/c.png');
  });
  it('dedupes URLs shared between the map and the content', () => {
    const figs = extractPatentFigures('![a](https://x.com/a.png)', { 'a.png': 'https://x.com/a.png' });
    expect(figs).toHaveLength(1);
  });
});

describe('getKindCodeExplanation', () => {
  it('distinguishes EP B1 (grant) from US B1 wording', () => {
    expect(getKindCodeExplanation('EP', 'B1')).toMatch(/Granted European/);
    expect(getKindCodeExplanation('US', 'B1')).toMatch(/Granted patent/);
  });
  it('flags WO as not a granted patent', () => {
    expect(getKindCodeExplanation('WO', 'A1')).toMatch(/not a granted patent/);
  });
  it('returns undefined without a kind code', () => {
    expect(getKindCodeExplanation('US', undefined)).toBeUndefined();
  });
});

describe('EPO single-newline parsing', () => {
  const epoContent = '## Abstract\nThe present invention relates to a solid electrolyte for a solid-state battery with good moisture stability.\n## Description\nDetailed text.';
  it('extracts an abstract despite single-newline spacing', () => {
    expect(extractPatentAbstract(epoContent)).toContain('solid electrolyte');
  });
  it('parses sections despite single-newline spacing', () => {
    const s = parsePatentSections(epoContent, ['description']);
    expect(s.description).toContain('Detailed text');
  });
});
