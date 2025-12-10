import { XmlNode, XmlFlattenedRecord } from '../types/xml';

/**
 * Flatten XML node structure into list of records.
 */
export function flattenXml(
  node: XmlNode,
  result: XmlFlattenedRecord[] = []
): XmlFlattenedRecord[] {
  const record: XmlFlattenedRecord = {
    path: node.path,
    tag: node.tag,
    attributes: node.attributes,
    text: node.text,
  };

  result.push(record);

  for (const child of node.children) {
    flattenXml(child, result);
  }

  return result;
}

/**
 * Convert flattened records to CSV format.
 */
export function toCSV(records: XmlFlattenedRecord[]): string {
  if (records.length === 0) {
    return '';
  }

  // Collect all unique attribute keys
  const allAttributeKeys = new Set<string>();
  records.forEach((record) => {
    Object.keys(record.attributes || {}).forEach((key) => {
      allAttributeKeys.add(key);
    });
  });

  const columns = [
    'path',
    'tag',
    'text',
    ...Array.from(allAttributeKeys).map((k) => `attr:${k}`),
  ];

  // Create CSV header
  const header = columns.join(',');

  // Create CSV rows
  const rows = records.map((record) => {
    return columns
      .map((col) => {
        let value: string;
        if (col === 'path') {
          value = record.path;
        } else if (col === 'tag') {
          value = record.tag;
        } else if (col === 'text') {
          value = record.text || '';
        } else if (col.startsWith('attr:')) {
          const attrName = col.replace('attr:', '');
          value = record.attributes?.[attrName] || '';
        } else {
          value = '';
        }

        // Escape CSV values (handle commas and quotes)
        if (
          value.includes(',') ||
          value.includes('"') ||
          value.includes('\n')
        ) {
          value = `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      })
      .join(',');
  });

  return [header, ...rows].join('\n');
}

/**
 * Convert flattened records to JSON format.
 */
export function toJSON(records: XmlFlattenedRecord[]): string {
  return JSON.stringify(records, null, 2);
}

/**
 * Download data as file.
 */
export function downloadFile(
  content: string,
  filename: string,
  mimeType: string
): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Export XML data to CSV.
 */
export function exportToCSV(
  node: XmlNode,
  filename: string = 'xml-data.csv'
): void {
  const records = flattenXml(node);
  const csv = toCSV(records);
  downloadFile(csv, filename, 'text/csv');
}

/**
 * Export XML data to JSON.
 */
export function exportToJSON(
  node: XmlNode,
  filename: string = 'xml-data.json'
): void {
  const records = flattenXml(node);
  const json = toJSON(records);
  downloadFile(json, filename, 'application/json');
}
