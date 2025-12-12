import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import CountView from '../components/CountView';
import { XmlNode } from '../types/xml';
import { CsvColumnsResponse, CsvRowsResponse } from '../types/csv';
import axios from 'axios';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('CountView', () => {
  const mockSetSelectedColumns = jest.fn();
  const mockFetchColumns = jest.fn().mockResolvedValue({
    columns: ['field1', 'field2', 'field3'],
    groups: {},
  });

  beforeEach(() => {
    mockSetSelectedColumns.mockClear();
    mockFetchColumns.mockClear();
    mockedAxios.get.mockClear();
    mockedAxios.post.mockClear();
    
    // Mock window.URL.createObjectURL for export tests
    global.URL.createObjectURL = jest.fn(() => 'blob:mock-url');
    global.URL.revokeObjectURL = jest.fn();
  });

  describe('CSV Data', () => {
    const csvHeaders = ['field1', 'field2', 'field3'];
    const csvData = {
      headers: csvHeaders,
      rows: [
        { data: { field1: 'value1', field2: 'A', field3: 'x' } },
        { data: { field1: 'value1', field2: 'B', field3: 'x' } },
        { data: { field1: 'value2', field2: 'A', field3: 'y' } },
        { data: { field1: 'value2', field2: 'C', field3: 'x' } },
      ],
    };
    const csvRows = csvData.rows.map((row) => row.data);
    const columnMetadata: CsvColumnsResponse = {
      columns: csvHeaders,
      groups: {},
    };

    it('renders with CSV data', () => {
      render(
        <CountView
          data={csvData}
          selectedColumns={new Set(['field1', 'field2'])}
          setSelectedColumns={mockSetSelectedColumns}
        />
      );

      // The field headers are rendered as <h3> inside .count-field-name
      expect(screen.getByText('field1')).toBeInTheDocument();
      expect(screen.getByText('field2')).toBeInTheDocument();
    });

    it('calculates unique counts correctly for CSV data', () => {
      render(
        <CountView
          data={csvData}
          selectedColumns={new Set(['field1'])}
          setSelectedColumns={mockSetSelectedColumns}
        />
      );

      // Should show value1 (2) and value2 (2)
      expect(screen.getByText(/value1/)).toBeInTheDocument();
      expect(screen.getByText(/value2/)).toBeInTheDocument();
      // Both values have count 2, so we should find multiple instances
      const countElements = screen.getAllByText(/\(2\)/);
      expect(countElements.length).toBeGreaterThanOrEqual(2);
    });


    it('shows column selector button for CSV data', async () => {
      // Mock axios response for count data
      const mockCountResponse: CsvRowsResponse = {
        rows: csvRows,
        total_count: csvRows.length,
        page: 1,
        page_size: 100,
        total_pages: 1,
      };
      mockedAxios.get.mockResolvedValue({ data: mockCountResponse });

      render(
        <CountView
          csvRows={csvRows}
          csvHeaders={csvHeaders}
          selectedColumns={new Set(['field1'])}
          setSelectedColumns={mockSetSelectedColumns}
          columnMetadata={columnMetadata}
          fetchColumns={mockFetchColumns}
          importId={1}
        />
      );

      // Wait for async operations
      await waitFor(() => {
        expect(mockedAxios.get).toHaveBeenCalled();
      });

      // Verify fetchColumns was called when columnMetadata is missing
      // (In this test, columnMetadata is provided, so fetchColumns shouldn't be called)
      expect(mockFetchColumns).not.toHaveBeenCalled();

      // There may be multiple 'Columns' buttons, so use getAllByText
      const columnButtons = screen.getAllByText(/Columns/i);
      expect(columnButtons.length).toBeGreaterThan(0);
    });


    it('opens column selector when button is clicked', async () => {
      // Mock axios response for count data
      const mockCountResponse: CsvRowsResponse = {
        rows: csvRows,
        total_count: csvRows.length,
        page: 1,
        page_size: 100,
        total_pages: 1,
      };
      mockedAxios.get.mockResolvedValue({ data: mockCountResponse });

      render(
        <CountView
          csvRows={csvRows}
          csvHeaders={csvHeaders}
          selectedColumns={new Set(['field1'])}
          setSelectedColumns={mockSetSelectedColumns}
          columnMetadata={columnMetadata}
          fetchColumns={mockFetchColumns}
          importId={1}
        />
      );

      // Wait for async operations
      await waitFor(() => {
        expect(mockedAxios.get).toHaveBeenCalled();
      });

      // There may be multiple 'Columns' buttons, click the first one
      const columnButtons = screen.getAllByText(/Columns/i);
      fireEvent.click(columnButtons[0]);
      expect(screen.getByText('Select Columns')).toBeInTheDocument();
    });


    it('handles empty selected columns', async () => {
      // Mock axios response for count data
      const mockCountResponse: CsvRowsResponse = {
        rows: csvRows,
        total_count: csvRows.length,
        page: 1,
        page_size: 100,
        total_pages: 1,
      };
      mockedAxios.get.mockResolvedValue({ data: mockCountResponse });

      render(
        <CountView
          csvRows={csvRows}
          csvHeaders={csvHeaders}
          selectedColumns={new Set()}
          setSelectedColumns={mockSetSelectedColumns}
          columnMetadata={columnMetadata}
          fetchColumns={mockFetchColumns}
          importId={1}
        />
      );

      // Wait for async operations
      await waitFor(() => {
        expect(mockedAxios.get).toHaveBeenCalled();
      });

      // Should show message or handle empty state
      const columnButtons = screen.getAllByText(/Columns/i);
      expect(columnButtons.length).toBeGreaterThan(0);
    });

    it('calls fetchColumns when columnMetadata is missing', async () => {
      // Mock axios response for count data
      const mockCountResponse: CsvRowsResponse = {
        rows: csvRows,
        total_count: csvRows.length,
        page: 1,
        page_size: 100,
        total_pages: 1,
      };
      mockedAxios.get.mockResolvedValue({ data: mockCountResponse });

      render(
        <CountView
          csvRows={csvRows}
          csvHeaders={csvHeaders}
          selectedColumns={new Set(['field1'])}
          setSelectedColumns={mockSetSelectedColumns}
          columnMetadata={null}
          fetchColumns={mockFetchColumns}
          importId={1}
        />
      );

      // Wait for fetchColumns to be called
      await waitFor(() => {
        expect(mockFetchColumns).toHaveBeenCalled();
      });
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
      expect(screen.getByText('tag')).toBeInTheDocument();
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
      expect(tagSection).not.toBeNull();
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

  describe('Export Functionality', () => {
    const csvHeaders = ['field1', 'field2', 'field3'];
    const csvRows = [
      { field1: 'value1', field2: 'A', field3: 'x' },
      { field1: 'value2', field2: 'B', field3: 'y' },
    ];
    const columnMetadata: CsvColumnsResponse = {
      columns: csvHeaders,
      groups: {},
    };

    beforeEach(() => {
      // Mock window.alert to suppress jsdom console errors
      window.alert = jest.fn();
    });

    it('exports counts to CSV when button is clicked', async () => {
      // Mock axios responses
      const mockCountResponse: CsvRowsResponse = {
        rows: csvRows,
        total_count: csvRows.length,
        page: 1,
        page_size: 100,
        total_pages: 1,
      };
      mockedAxios.get.mockResolvedValue({ data: mockCountResponse });
      
      const mockExportBlob = new Blob(['field1,count\nvalue1,1\nvalue2,1'], {
        type: 'text/csv',
      });
      mockedAxios.post.mockResolvedValue({ data: mockExportBlob });

      render(
        <CountView
          csvRows={csvRows}
          csvHeaders={csvHeaders}
          selectedColumns={new Set(['field1'])}
          setSelectedColumns={mockSetSelectedColumns}
          columnMetadata={columnMetadata}
          fetchColumns={mockFetchColumns}
          importId={1}
        />
      );

      // Wait for data to load
      await waitFor(() => {
        expect(mockedAxios.get).toHaveBeenCalled();
      });

      // Wait for field counts to render
      await waitFor(() => {
        expect(screen.getByText('field1')).toBeInTheDocument();
      });

      // Find and click export button
      const exportButton = screen.getByText(/Export Counts to CSV/i);
      fireEvent.click(exportButton);

      // Verify export API was called with correct parameters
      await waitFor(() => {
        expect(mockedAxios.post).toHaveBeenCalledWith(
          '/api/csv/exports/counts',
          {
            import_id: 1,
            columns: ['field1'],
          },
          {
            responseType: 'blob',
          }
        );
      });
    });
  });

  describe('Pagination Controls', () => {
    const csvHeaders = ['field1', 'field2'];
    const csvRows = Array.from({ length: 150 }, (_, i) => ({
      field1: `value${i}`,
      field2: `data${i}`,
    }));
    const columnMetadata: CsvColumnsResponse = {
      columns: csvHeaders,
      groups: {},
    };

    it('navigates to next page when Next button is clicked', async () => {
      // Mock axios response for first page
      const mockCountResponsePage1: CsvRowsResponse = {
        rows: csvRows.slice(0, 100),
        total_count: 150,
        page: 1,
        page_size: 100,
        total_pages: 2,
      };
      mockedAxios.get.mockResolvedValue({ data: mockCountResponsePage1 });

      render(
        <CountView
          csvRows={csvRows}
          csvHeaders={csvHeaders}
          selectedColumns={new Set(['field1'])}
          setSelectedColumns={mockSetSelectedColumns}
          columnMetadata={columnMetadata}
          fetchColumns={mockFetchColumns}
          importId={1}
        />
      );

      // Wait for initial load
      await waitFor(() => {
        expect(mockedAxios.get).toHaveBeenCalled();
      });

      // Mock response for second page
      const mockCountResponsePage2: CsvRowsResponse = {
        rows: csvRows.slice(100, 150),
        total_count: 150,
        page: 2,
        page_size: 100,
        total_pages: 2,
      };
      mockedAxios.get.mockResolvedValue({ data: mockCountResponsePage2 });

      // Find and click Next button
      const nextButton = screen.getByText('Next');
      fireEvent.click(nextButton);

      // Verify API was called for page 2
      await waitFor(() => {
        expect(mockedAxios.get).toHaveBeenCalledWith(
          '/api/csv/imports/1/rows',
          expect.objectContaining({
            params: expect.objectContaining({
              page: 2,
            }),
          })
        );
      });
    });

    it('changes page size when selector value changes', async () => {
      // Mock axios response
      const mockCountResponse: CsvRowsResponse = {
        rows: csvRows.slice(0, 50),
        total_count: 150,
        page: 1,
        page_size: 50,
        total_pages: 3,
      };
      mockedAxios.get.mockResolvedValue({ data: mockCountResponse });

      render(
        <CountView
          csvRows={csvRows}
          csvHeaders={csvHeaders}
          selectedColumns={new Set(['field1'])}
          setSelectedColumns={mockSetSelectedColumns}
          columnMetadata={columnMetadata}
          fetchColumns={mockFetchColumns}
          importId={1}
        />
      );

      // Wait for initial load
      await waitFor(() => {
        expect(mockedAxios.get).toHaveBeenCalled();
      });

      // Mock response for new page size
      const mockCountResponseNewSize: CsvRowsResponse = {
        rows: csvRows.slice(0, 250),
        total_count: 150,
        page: 1,
        page_size: 250,
        total_pages: 1,
      };
      mockedAxios.get.mockResolvedValue({ data: mockCountResponseNewSize });

      // Find and change page size selector
      const pageSizeSelect = screen.getByLabelText(/Rows per page:/i);
      fireEvent.change(pageSizeSelect, { target: { value: '250' } });

      // Verify API was called with new page size
      await waitFor(() => {
        expect(mockedAxios.get).toHaveBeenCalledWith(
          '/api/csv/imports/1/rows',
          expect.objectContaining({
            params: expect.objectContaining({
              page_size: 250,
            }),
          })
        );
      });
    });

    it('disables Previous button on first page', async () => {
      const mockCountResponse: CsvRowsResponse = {
        rows: csvRows.slice(0, 100),
        total_count: 150,
        page: 1,
        page_size: 100,
        total_pages: 2,
      };
      mockedAxios.get.mockResolvedValue({ data: mockCountResponse });

      render(
        <CountView
          csvRows={csvRows}
          csvHeaders={csvHeaders}
          selectedColumns={new Set(['field1'])}
          setSelectedColumns={mockSetSelectedColumns}
          columnMetadata={columnMetadata}
          fetchColumns={mockFetchColumns}
          importId={1}
        />
      );

      await waitFor(() => {
        expect(mockedAxios.get).toHaveBeenCalled();
      });

      const previousButton = screen.getByText('Previous');
      expect(previousButton).toBeDisabled();
    });
  });

  describe('Loading and Error States', () => {
    const csvHeaders = ['field1', 'field2'];
    const csvRows = [
      { field1: 'value1', field2: 'A' },
      { field1: 'value2', field2: 'B' },
    ];
    const columnMetadata: CsvColumnsResponse = {
      columns: csvHeaders,
      groups: {},
    };

    it('shows loading indicator while fetching data', async () => {
      // Mock a delayed axios response
      mockedAxios.get.mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(() => {
              resolve({
                data: {
                  rows: csvRows,
                  total_count: csvRows.length,
                  page: 1,
                  page_size: 100,
                  total_pages: 1,
                },
              });
            }, 100);
          })
      );

      render(
        <CountView
          csvRows={csvRows}
          csvHeaders={csvHeaders}
          selectedColumns={new Set(['field1'])}
          setSelectedColumns={mockSetSelectedColumns}
          columnMetadata={columnMetadata}
          fetchColumns={mockFetchColumns}
          importId={1}
        />
      );

      // Should show loading message
      expect(screen.getByText(/Loading page 1.../i)).toBeInTheDocument();

      // Wait for loading to complete
      await waitFor(() => {
        expect(screen.queryByText(/Loading page 1.../i)).not.toBeInTheDocument();
      });
    });

    it('shows error message when API call fails', async () => {
      // Mock axios to reject
      mockedAxios.get.mockRejectedValue({
        response: {
          data: {
            detail: 'Failed to fetch data',
          },
        },
      });

      render(
        <CountView
          csvRows={csvRows}
          csvHeaders={csvHeaders}
          selectedColumns={new Set(['field1'])}
          setSelectedColumns={mockSetSelectedColumns}
          columnMetadata={columnMetadata}
          fetchColumns={mockFetchColumns}
          importId={1}
        />
      );

      // Wait for error to appear
      await waitFor(() => {
        expect(screen.getByText(/Error loading data/i)).toBeInTheDocument();
      });

      // Error message appears in multiple places, use getAllByText
      const errorMessages = screen.getAllByText(/Failed to fetch data/i);
      expect(errorMessages.length).toBeGreaterThan(0);
      expect(
        screen.getByText(/Please try refreshing the page/i)
      ).toBeInTheDocument();
    });

    it('shows generic error message when error has no detail', async () => {
      // Mock axios to reject without detail
      mockedAxios.get.mockRejectedValue(new Error('Network error'));

      render(
        <CountView
          csvRows={csvRows}
          csvHeaders={csvHeaders}
          selectedColumns={new Set(['field1'])}
          setSelectedColumns={mockSetSelectedColumns}
          columnMetadata={columnMetadata}
          fetchColumns={mockFetchColumns}
          importId={1}
        />
      );

      // Wait for error to appear
      await waitFor(() => {
        expect(screen.getByText(/Error loading data/i)).toBeInTheDocument();
      });

      // Error message appears in multiple places, use getAllByText
      const errorMessages = screen.getAllByText(/Failed to fetch count data/i);
      expect(errorMessages.length).toBeGreaterThan(0);
    });
  });
});
