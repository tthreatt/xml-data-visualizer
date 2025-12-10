import { render, screen, fireEvent } from '@testing-library/react';
import CountView from '../components/CountView';
import { XmlNode } from '../types/xml';
import { CsvColumnsResponse } from '../types/csv';

describe('CountView', () => {
  const mockSetSelectedColumns = jest.fn();
  const mockFetchColumns = jest.fn();

  beforeEach(() => {
    mockSetSelectedColumns.mockClear();
    mockFetchColumns.mockClear();
  });

  describe('CSV Data', () => {
    const csvRows = [
      { field1: 'value1', field2: 'A', field3: 'x' },
      { field1: 'value1', field2: 'B', field3: 'x' },
      { field1: 'value2', field2: 'A', field3: 'y' },
      { field1: 'value2', field2: 'C', field3: 'x' },
    ];

    const csvHeaders = ['field1', 'field2', 'field3'];
    const columnMetadata: CsvColumnsResponse = {
      columns: csvHeaders,
      groups: {},
    };

    it('renders with CSV data', () => {
      render(
        <CountView
          csvRows={csvRows}
          csvHeaders={csvHeaders}
          selectedColumns={new Set(['field1', 'field2'])}
          setSelectedColumns={mockSetSelectedColumns}
          columnMetadata={columnMetadata}
          fetchColumns={mockFetchColumns}
        />
      );

      expect(screen.getByText('field1')).toBeInTheDocument();
      expect(screen.getByText('field2')).toBeInTheDocument();
    });

    it('calculates unique counts correctly for CSV data', () => {
      render(
        <CountView
          csvRows={csvRows}
          csvHeaders={csvHeaders}
          selectedColumns={new Set(['field1'])}
          setSelectedColumns={mockSetSelectedColumns}
          columnMetadata={columnMetadata}
          fetchColumns={mockFetchColumns}
        />
      );

      // Should show value1 (2) and value2 (2)
      expect(screen.getByText(/value1/)).toBeInTheDocument();
      expect(screen.getByText(/value2/)).toBeInTheDocument();
      // Both values have count 2, so we should find multiple instances
      const countElements = screen.getAllByText(/\(2\)/);
      expect(countElements.length).toBeGreaterThanOrEqual(2);
    });

    it('shows column selector button for CSV data', () => {
      render(
        <CountView
          csvRows={csvRows}
          csvHeaders={csvHeaders}
          selectedColumns={new Set(['field1'])}
          setSelectedColumns={mockSetSelectedColumns}
          columnMetadata={columnMetadata}
          fetchColumns={mockFetchColumns}
        />
      );

      const columnButton = screen.getByText(/Columns/i);
      expect(columnButton).toBeInTheDocument();
    });

    it('opens column selector when button is clicked', () => {
      render(
        <CountView
          csvRows={csvRows}
          csvHeaders={csvHeaders}
          selectedColumns={new Set(['field1'])}
          setSelectedColumns={mockSetSelectedColumns}
          columnMetadata={columnMetadata}
          fetchColumns={mockFetchColumns}
        />
      );

      const columnButton = screen.getByText(/Columns/i);
      fireEvent.click(columnButton);

      expect(screen.getByText('Select Columns')).toBeInTheDocument();
    });

    it('handles empty selected columns', () => {
      render(
        <CountView
          csvRows={csvRows}
          csvHeaders={csvHeaders}
          selectedColumns={new Set()}
          setSelectedColumns={mockSetSelectedColumns}
          columnMetadata={columnMetadata}
          fetchColumns={mockFetchColumns}
        />
      );

      // Should show message or handle empty state
      expect(screen.getByText(/Columns/i)).toBeInTheDocument();
    });
  });

  describe('XML Data', () => {
    const xmlData: XmlNode = {
      tag: 'root',
      path: '/root',
      xpath: '/root',
      attributes: { attr1: 'value1' },
      text: 'root text',
      children: [
        {
          tag: 'child1',
          path: '/root/child1',
          xpath: '/root/child1',
          attributes: { attr1: 'value1', attr2: 'value2' },
          text: 'child1 text',
          children: [],
        },
        {
          tag: 'child2',
          path: '/root/child2',
          xpath: '/root/child2',
          attributes: { attr1: 'value2' },
          text: 'child2 text',
          children: [],
        },
      ],
    };

    it('renders with XML data', () => {
      render(<CountView data={xmlData} />);

      // Should render count view for XML
      expect(screen.getByText(/tag/i)).toBeInTheDocument();
    });

    it('calculates unique counts for XML tag field', () => {
      render(<CountView data={xmlData} />);

      // Should show tag field with root, child1, child2
      // Check that tag field section exists
      expect(screen.getByText('tag')).toBeInTheDocument();
      // Check for tag values specifically (not path values)
      const tagSection = screen
        .getByText('tag')
        .closest('.count-field-section');
      expect(tagSection).toBeInTheDocument();
      // Within tag section, should have root, child1, child2
      expect(tagSection?.textContent).toContain('root');
      expect(tagSection?.textContent).toContain('child1');
      expect(tagSection?.textContent).toContain('child2');
    });
  });

  describe('Empty State', () => {
    it('handles empty CSV rows', () => {
      render(
        <CountView
          csvRows={[]}
          csvHeaders={[]}
          selectedColumns={new Set()}
          setSelectedColumns={mockSetSelectedColumns}
          columnMetadata={null}
          fetchColumns={mockFetchColumns}
        />
      );

      // Should show empty state message
      expect(
        screen.getByText(/No fields selected for counting/i)
      ).toBeInTheDocument();
    });

    it('handles null data', () => {
      render(<CountView data={undefined} />);

      // Should show empty state message
      expect(
        screen.getByText(/No fields selected for counting/i)
      ).toBeInTheDocument();
    });
  });
});
