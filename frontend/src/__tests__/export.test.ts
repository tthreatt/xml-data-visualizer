import { flattenXml, toCSV, toJSON } from '../utils/export';
import { XmlNode } from '../types/xml';

describe('export utilities', () => {
  const sampleNode: XmlNode = {
    tag: 'root',
    attributes: {},
    text: null,
    path: '/root',
    xpath: '/root',
    children: [
      {
        tag: 'book',
        attributes: { id: '1', isbn: '123' },
        text: 'Sample Book',
        path: '/root/book',
        xpath: '/root/book[1]',
        children: [],
      },
    ],
  };

  describe('flattenXml', () => {
    it('flattens XML node structure', () => {
      const result = flattenXml(sampleNode);
      expect(result).toHaveLength(2);
      expect(result[0].tag).toBe('root');
      expect(result[1].tag).toBe('book');
    });
  });

  describe('toCSV', () => {
    it('converts records to CSV format', () => {
      const records = flattenXml(sampleNode);
      const csv = toCSV(records);
      expect(csv).toContain('path,tag,text');
      expect(csv).toContain('/root,root,');
      expect(csv).toContain('/root/book,book,Sample Book');
    });

    it('handles empty records', () => {
      const csv = toCSV([]);
      expect(csv).toBe('');
    });
  });

  describe('toJSON', () => {
    it('converts records to JSON format', () => {
      const records = flattenXml(sampleNode);
      const json = toJSON(records);
      const parsed = JSON.parse(json);
      expect(parsed).toHaveLength(2);
      expect(parsed[0].tag).toBe('root');
    });
  });
});
