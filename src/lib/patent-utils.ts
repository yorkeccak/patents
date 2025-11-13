/**
 * Patent parsing utilities for extracting structured data from patent content
 */

export interface PatentMetadata {
  patentNumber?: string;
  publicationDate?: string;
  applicationNumber?: string;
  filingDate?: string;
  assignees?: Array<{ name: string; location?: string }>;
  claimsCount?: number;
  inventors?: string[];
}

/**
 * Intelligently extract the abstract from patent content
 * Stops at the end of the Abstract section, not mid-sentence
 */
export function extractPatentAbstract(content: string): string {
  // Try to find the Abstract section with various patterns
  const abstractPatterns = [
    /##\s*Abstract\s*\n\n([\s\S]*?)(?=\n##|$)/i, // ## Abstract followed by content until next ##
    /Abstract:\s*\n\n([\s\S]*?)(?=\n##|$)/i,    // Abstract: followed by content
    /ABSTRACT\s*\n\n([\s\S]*?)(?=\n##|DESCRIPTION|CLAIMS|BACKGROUND|$)/i, // ABSTRACT in caps
  ];

  for (const pattern of abstractPatterns) {
    const match = content.match(pattern);
    if (match && match[1]) {
      const abstract = match[1].trim();
      // Make sure we have a reasonable amount of text (not too short)
      if (abstract.length > 50) {
        return abstract;
      }
    }
  }

  // Fallback: Look for content between title and Description section
  const fallbackPattern = /(?:##\s*[\w\s-]+\n\n)+([\s\S]{100,1000}?)(?=\n##\s*Description|$)/i;
  const fallbackMatch = content.match(fallbackPattern);
  if (fallbackMatch && fallbackMatch[1]) {
    return fallbackMatch[1].trim();
  }

  // Last resort: take first 400 characters after the patent number/title
  const lines = content.split('\n');
  let startCollecting = false;
  let collected = '';

  for (const line of lines) {
    // Skip header lines
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
 * Extract structured metadata from patent content
 */
export function parsePatentMetadata(content: string): PatentMetadata {
  const metadata: PatentMetadata = {};

  // Extract patent number
  const patentNumberMatch = content.match(/\*\*Patent Number:\*\*\s*(US\s*[\d,]+\s*[A-Z]\d*)/i);
  if (patentNumberMatch) {
    metadata.patentNumber = patentNumberMatch[1].replace(/,/g, '');
  }

  // Extract publication date
  const publicationDateMatch = content.match(/\*\*Publication Date:\*\*\s*([\d-]+)/i);
  if (publicationDateMatch) {
    metadata.publicationDate = publicationDateMatch[1];
  }

  // Extract application number
  const applicationNumberMatch = content.match(/\*\*Application Number:\*\*\s*([\d,]+)/i);
  if (applicationNumberMatch) {
    metadata.applicationNumber = applicationNumberMatch[1].replace(/,/g, '');
  }

  // Extract filing date
  const filingDateMatch = content.match(/\*\*Filing Date:\*\*\s*([\d-]+)/i);
  if (filingDateMatch) {
    metadata.filingDate = filingDateMatch[1];
  }

  // Extract assignees
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
          location: locationMatch ? locationMatch[1] : undefined
        };
      });
  }

  // Extract number of claims
  const claimsMatch = content.match(/\*\*Number of Claims:\*\*\s*(\d+)/i);
  if (claimsMatch) {
    metadata.claimsCount = parseInt(claimsMatch[1], 10);
  }

  return metadata;
}

/**
 * Parse patent content into structured sections
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
  const wantAll = !requestedSections || requestedSections.includes('all');

  // Extract abstract
  if (wantAll || requestedSections?.includes('abstract')) {
    sections.abstract = extractPatentAbstract(content);
  }

  // Extract claims
  if (wantAll || requestedSections?.includes('claims')) {
    const claimsMatch = content.match(/##\s*Claims?\s*\n\n([\s\S]*?)(?=\n##|$)/i);
    if (claimsMatch) {
      sections.claims = claimsMatch[1].trim();
    }
  }

  // Extract description
  if (wantAll || requestedSections?.includes('description')) {
    const descriptionPatterns = [
      /##\s*Description\s*\n\n([\s\S]*?)(?=\n##\s*Claims|$)/i,
      /##\s*Detailed Description\s*\n\n([\s\S]*?)(?=\n##|$)/i,
    ];
    for (const pattern of descriptionPatterns) {
      const match = content.match(pattern);
      if (match) {
        sections.description = match[1].trim();
        break;
      }
    }
  }

  // Extract drawings description
  if (wantAll || requestedSections?.includes('drawings')) {
    const drawingsMatch = content.match(/##\s*Description of Drawings\s*\n\n([\s\S]*?)(?=\n##|$)/i);
    if (drawingsMatch) {
      sections.drawings = drawingsMatch[1].trim();
    }
  }

  // Extract citations (if available in content)
  if (wantAll || requestedSections?.includes('citations')) {
    const citationsMatch = content.match(/##\s*Citations?.*?\n\n([\s\S]*?)(?=\n##|$)/i);
    if (citationsMatch) {
      sections.citations = citationsMatch[1].trim();
    }
  }

  return sections;
}

/**
 * Extract patent number from various formats in the content
 */
export function extractPatentNumber(content: string, fallbackTitle?: string): string {
  // Try structured format first
  const structuredMatch = content.match(/\*\*Patent Number:\*\*\s*(US\s*[\d,]+\s*[A-Z]\d*)/i);
  if (structuredMatch) {
    return structuredMatch[1].replace(/,/g, '').trim();
  }

  // Try title format (use [\s\S] instead of . with s flag for ES compatibility)
  const titleMatch = content.match(/Patent Grant Information[\s\S]*?US\s*([\d,]+\s*[A-Z]\d*)/i);
  if (titleMatch) {
    return ('US ' + titleMatch[1]).replace(/,/g, '').trim();
  }

  // Try simple US patent pattern
  const simpleMatch = content.match(/US\s*[\d,]+\s*[A-Z]\d*/i);
  if (simpleMatch) {
    return simpleMatch[0].replace(/,/g, '').trim();
  }

  // Fallback to ID format if provided
  if (fallbackTitle) {
    const idMatch = fallbackTitle.match(/US\s*[\d,]+\s*[A-Z]\d*/i);
    if (idMatch) {
      return idMatch[0].replace(/,/g, '').trim();
    }
  }

  return 'Unknown';
}
