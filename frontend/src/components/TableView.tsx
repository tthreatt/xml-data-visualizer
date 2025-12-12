import * as React from 'react';
import { useMemo } from 'react';
import axios from 'axios';
import { XmlNode, XmlFlattenedRecord } from '../types/xml';
import { CsvData, CsvColumnsResponse } from '../types/csv';
import { flattenXml } from '../utils/export';
import ColumnSelector from './ColumnSelector';
import './TableView.css';

// Maximum number of rows to render at once to prevent browser crashes
const MAX_RENDER_ROWS = 500;

interface TableViewProps {
  data?: XmlNode | CsvData;
  // New props for CSV API-based data
  csvRows?: Record<string, string>[];
  csvHeaders?: string[];
  csvPagination?: {
    page: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
  };
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (pageSize: number | 'all') => void;
  loading?: boolean;
  // Column selection props
  selectedColumns?: Set<string>;
  setSelectedColumns?: (columns: Set<string>) => void;
  columnMetadata?: CsvColumnsResponse | null;
  fetchColumns?: () => Promise<CsvColumnsResponse | null>;
  importId?: number | null;
}

export default function TableView({
  data,
  csvRows,
  csvHeaders,
  csvPagination,
  onPageChange,
  onPageSizeChange,
  loading = false,
  selectedColumns,
  setSelectedColumns,
  columnMetadata,
  fetchColumns,
  importId,
}: TableViewProps) {
    // Export all data to CSV handler (must be inside component to access state)
    const handleExportAll = async (): Promise<void> => {
      if (!isCsvApiMode || !importId || columns.length === 0) return;
      try {
        const response = await axios.post(
          `/api/csv/exports/all`,
          {
            import_id: importId,
            columns: columns,
          },
          {
            responseType: 'blob',
          }
        );
        // Download CSV file
        const url = window.URL.createObjectURL(new Blob([response.data], { type: 'text/csv' }));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `all_data_${importId}.csv`);
        document.body.appendChild(link);
        link.click();
        link.parentNode?.removeChild(link);
      } catch (err) {
        alert('Failed to export all data to CSV.');
      }
    };
  const [sortColumn, setSortColumn] = React.useState<string | null>(null);
  const [sortDirection, setSortDirection] = React.useState<'asc' | 'desc'>('asc');
  const [filterText, setFilterText] = React.useState('');
  const [visibleColumns, setVisibleColumns] = React.useState<Set<string>>(new Set());
  const [showColumnSelector, setShowColumnSelector] = React.useState(false);

  const isCsvData = (d?: XmlNode | CsvData): d is CsvData => {
    return d !== undefined && 'headers' in d && 'rows' in d;
  };

  const isCsvApiMode = csvRows !== undefined && csvHeaders !== undefined;

  // Fetch columns metadata when CSV data is loaded
  React.useEffect(() => {
    if (isCsvApiMode && importId && fetchColumns && !columnMetadata) {
      fetchColumns();
    }
  }, [importId, fetchColumns, columnMetadata, isCsvApiMode]);

  // Freeze background scrolling when modal is open
  React.useEffect(() => {
    if (showColumnSelector) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [showColumnSelector]);

  // Use selectedColumns if available, otherwise fall back to visibleColumns
  const effectiveSelectedColumns = React.useMemo(() => {
    if (isCsvApiMode && selectedColumns && selectedColumns.size > 0) {
      return selectedColumns;
    }
    return visibleColumns;
  }, [isCsvApiMode, selectedColumns, visibleColumns]);

  // Helper function to extract header prefix (type grouping)
  const getHeaderPrefix = (header: string): string => {
    const underscoreIndex = header.indexOf('_');
    return underscoreIndex > 0 ? header.substring(0, underscoreIndex) : header;
  };

  // Group columns by prefix (type grouping)
  const columnGroups = React.useMemo(() => {
    if (!isCsvApiMode && !isCsvData(data)) {
      return null; // No grouping for XML
    }

    const allCols = isCsvApiMode
      ? csvHeaders || []
      : isCsvData(data)
        ? data.headers
        : [];
    if (allCols.length === 0) return null;

    // Determine which columns to show
    let colsToGroup: string[];
    if (isCsvApiMode && effectiveSelectedColumns.size > 0) {
      // Use selected columns if available
      colsToGroup = Array.from(effectiveSelectedColumns);
    } else if (allCols.length > 100 && effectiveSelectedColumns.size === 0) {
      colsToGroup = allCols.slice(0, 100);
      if (effectiveSelectedColumns.size === 0 && setSelectedColumns) {
        setSelectedColumns(new Set(colsToGroup));
      } else if (effectiveSelectedColumns.size === 0) {
        setVisibleColumns(new Set(colsToGroup));
      }
    } else if (effectiveSelectedColumns.size > 0) {
      colsToGroup = Array.from(effectiveSelectedColumns);
    } else {
      colsToGroup = allCols;
    }

    // Group columns by prefix
    const groups: Map<string, string[]> = new Map();
    for (const col of colsToGroup) {
      const prefix = getHeaderPrefix(col);
      if (!groups.has(prefix)) {
        groups.set(prefix, []);
      }
      groups.get(prefix)!.push(col);
    }

    return groups;
  }, [
    data,
    csvHeaders,
    effectiveSelectedColumns,
    isCsvApiMode,
    setSelectedColumns,
  ]);

  // Determine columns (flattened from groups for backward compatibility)
  const columns = React.useMemo(() => {
    if (columnGroups) {
      // Flatten column groups maintaining order
      const cols: string[] = [];
      columnGroups.forEach((groupCols) => {
        cols.push(...groupCols);
      });
      return cols;
    }

    if (isCsvApiMode) {
      // CSV API mode - use headers from API
      const allCols = csvHeaders || [];
      if (effectiveSelectedColumns.size > 0) {
        return Array.from(effectiveSelectedColumns);
      }
      if (allCols.length > 100 && effectiveSelectedColumns.size === 0) {
        const limited = allCols.slice(0, 100);
        if (setSelectedColumns) {
          setSelectedColumns(new Set(limited));
        } else {
          setVisibleColumns(new Set(limited));
        }
        return limited;
      }
      return allCols;
    } else if (isCsvData(data)) {
      // Legacy CSV data mode
      const allCols = data.headers;
      if (effectiveSelectedColumns.size > 0) {
        return Array.from(effectiveSelectedColumns);
      }
      if (allCols.length > 100 && effectiveSelectedColumns.size === 0) {
        const limited = allCols.slice(0, 100);
        setVisibleColumns(new Set(limited));
        return limited;
      }
      return allCols;
    } else if (data) {
      // XML mode
      const flattenedData = flattenXml(data);
      const cols = new Set<string>(['path', 'tag', 'text']);
      flattenedData.forEach((record) => {
        Object.keys(record.attributes || {}).forEach((attr) => {
          cols.add(`attr:${attr}`);
        });
      });
      return Array.from(cols);
    }
    return [];
  }, [
    data,
    csvHeaders,
    effectiveSelectedColumns,
    isCsvApiMode,
    columnGroups,
    setSelectedColumns,
  ]);

  // Get data to display
  const displayData = React.useMemo(() => {
    if (isCsvApiMode) {
      // Convert CSV API rows to display format
      // Add safeguard: ensure row is an object
      return csvRows.map((row, index) => {
        if (!row || typeof row !== 'object') {
          console.warn(`Invalid row at index ${index}:`, row);
          return {
            path: '',
            tag: '',
            text: '',
            attributes: {},
          };
        }
        return {
          path: '',
          tag: '',
          text: '',
          attributes: row,
        };
      });
    } else if (isCsvData(data)) {
      // Legacy CSV data
      return data.rows.map((row) => ({
        path: '',
        tag: '',
        text: '',
        attributes: row.data,
      }));
    } else if (data) {
      // XML data
      return flattenXml(data);
    }
    return [];
  }, [data, csvRows, isCsvApiMode]);

  // Filter data (client-side for XML, server-side for CSV API)
  const filteredData = React.useMemo(() => {
    if (isCsvApiMode) {
      // For CSV API mode, filtering is done server-side
      // Just apply client-side text filter if needed
      if (!filterText) return displayData;
      const lowerFilter = filterText.toLowerCase();
      return displayData.filter((record) =>
        Object.values(record.attributes || {}).some(
          (val) => val && val.toString().toLowerCase().includes(lowerFilter)
        )
      );
    } else {
      // Legacy mode - client-side filtering
      if (!filterText) return displayData;
      const lowerFilter = filterText.toLowerCase();
      return displayData.filter((record) => {
        if (isCsvData(data)) {
          return Object.values(record.attributes || {}).some(
            (val) => val && val.toString().toLowerCase().includes(lowerFilter)
          );
        } else {
          return (
            record.path.toLowerCase().includes(lowerFilter) ||
            record.tag.toLowerCase().includes(lowerFilter) ||
            (record.text && record.text.toLowerCase().includes(lowerFilter)) ||
            Object.values(record.attributes || {}).some(
              (val) => val && val.toString().toLowerCase().includes(lowerFilter)
            )
          );
        }
      });
    }
  }, [displayData, filterText, data, isCsvApiMode]);

  // Sort data (client-side)
  const sortedData = useMemo(() => {
    if (!sortColumn) return filteredData;
    return [...filteredData].sort((a, b) => {
      let aVal: string | null = null;
      let bVal: string | null = null;

      if (isCsvApiMode || isCsvData(data)) {
        aVal = a.attributes?.[sortColumn] || '';
        bVal = b.attributes?.[sortColumn] || '';
      } else {
        if (sortColumn === 'path') {
          aVal = a.path;
          bVal = b.path;
        } else if (sortColumn === 'tag') {
          aVal = a.tag;
          bVal = b.tag;
        } else if (sortColumn === 'text') {
          aVal = a.text || '';
          bVal = b.text || '';
        } else if (sortColumn.startsWith('attr:')) {
          const attrName = sortColumn.replace('attr:', '');
          aVal = a.attributes?.[attrName] || '';
          bVal = b.attributes?.[attrName] || '';
        }
      }

      const comparison = (aVal || '').localeCompare(bVal || '');
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [filteredData, sortColumn, sortDirection, data, isCsvApiMode]);

  // Group rows by caqhProviderId (person grouping) for CSV data
  const groupedData = useMemo(() => {
    if (!isCsvApiMode && !isCsvData(data)) {
      return sortedData; // No grouping for XML
    }

    const PERSON_ID_COLUMN = 'caqhProviderId';

    // Check if caqhProviderId column exists
    if (!columns.includes(PERSON_ID_COLUMN)) {
      return sortedData; // No grouping if column doesn't exist
    }

    // Group rows by caqhProviderId
    const groups: Map<string, typeof sortedData> = new Map();
    const ungrouped: typeof sortedData = [];

    for (const record of sortedData) {
      const personId = record.attributes?.[PERSON_ID_COLUMN] || '';
      if (personId) {
        if (!groups.has(personId)) {
          groups.set(personId, []);
        }
        groups.get(personId)!.push(record);
      } else {
        ungrouped.push(record);
      }
    }

    // Flatten groups maintaining order (groups are already sorted within)
    const grouped: ((typeof sortedData)[0] & {
      _groupStart?: boolean;
      _personId?: string;
    })[] = [];

    // Add grouped rows with group markers
    groups.forEach((groupRows, personId) => {
      groupRows.forEach((row, index) => {
        grouped.push({
          ...row,
          _groupStart: index === 0,
          _personId: personId,
        });
      });
    });

    // Add ungrouped rows at the end
    ungrouped.forEach((row) => {
      grouped.push(row);
    });

    return grouped;
  }, [sortedData, columns, isCsvApiMode, data]);

  // Limit rendered data to prevent browser crashes with large datasets
  const renderedData = useMemo(() => {
    if (groupedData.length <= MAX_RENDER_ROWS) {
      return groupedData;
    }
    return groupedData.slice(0, MAX_RENDER_ROWS);
  }, [groupedData]);

  // Check if data was truncated for rendering
  const isDataTruncated = groupedData.length > MAX_RENDER_ROWS;

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  interface TableRecord {
    path?: string;
    tag?: string;
    text?: string | null;
    attributes?: Record<string, string>;
    [key: string]: unknown;
  }

  const getCellValue = (record: { attributes?: Record<string, string>; path?: string; tag?: string; text?: string | null }, column: string): string => {
    if (isCsvApiMode || isCsvData(data)) {
      return record.attributes?.[column] || '';
    } else {
      if (column === 'path') return record.path || '';
      if (column === 'tag') return record.tag || '';
      if (column === 'text') return record.text || '';
      if (column.startsWith('attr:')) {
        const attrName = column.replace('attr:', '');
        return record.attributes?.[attrName] || '';
      }
      return '';
    }
  };

  const handlePageChange = (newPage: number) => {
    if (onPageChange && csvPagination) {
      onPageChange(newPage);
    }
  };

  const handleColumnSelectionChange = (newSelection: Set<string>) => {
    if (setSelectedColumns) {
      setSelectedColumns(newSelection);
    } else {
      setVisibleColumns(newSelection);
    }
  };

  // Determine current page size value for the selector
  const currentPageSizeValue = useMemo(() => {
    if (!isCsvApiMode || !csvPagination) return '100';
    // "all" is selected if pageSize is >= 10000 (our fallback) or equals totalCount
    const isAllSelected =
      csvPagination.pageSize >= 10000 ||
      (csvPagination.totalCount > 0 &&
        csvPagination.pageSize === csvPagination.totalCount);
    // If "all" is selected but dataset is too large, use MAX_RENDER_ROWS instead
    if (isAllSelected && csvPagination.totalCount > MAX_RENDER_ROWS) {
      return String(MAX_RENDER_ROWS);
    }
    return isAllSelected ? 'all' : String(csvPagination.pageSize);
  }, [isCsvApiMode, csvPagination]);

  return (
      <div className="table-view">
        {/* Export All to CSV button for CSV API mode */}
        {isCsvApiMode && columns.length > 0 && importId && (
          <button
            onClick={handleExportAll}
            className="export-counts-button"
            title="Export all data as shown to CSV"
            style={{ marginBottom: '1em' }}
          >
            Export All to CSV
          </button>
        )}
      <div className="table-controls">
        <input
          type="text"
          placeholder="Filter rows..."
          value={filterText}
          onChange={(e) => setFilterText(e.target.value)}
          className="table-filter"
          disabled={loading}
        />
        {isCsvApiMode && columnMetadata && (
          <button
            onClick={() => setShowColumnSelector(true)}
            className="column-selector-button"
            title="Select columns to display"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M3 3h18v18H3z" />
              <path d="M3 9h18M9 3v18" />
            </svg>
            Columns
            {effectiveSelectedColumns.size > 0 && (
              <span className="column-count-badge">
                {effectiveSelectedColumns.size}
              </span>
            )}
          </button>
        )}
      </div>

      {showColumnSelector && isCsvApiMode && columnMetadata && (
        <div
          className="column-selector-modal-overlay"
          onClick={() => setShowColumnSelector(false)}
        >
          <div onClick={(e) => e.stopPropagation()}>
            <ColumnSelector
              columns={columnMetadata.columns}
              selectedColumns={effectiveSelectedColumns}
              onSelectionChange={handleColumnSelectionChange}
              onClose={() => setShowColumnSelector(false)}
            />
          </div>
        </div>
      )}

      {loading && <div className="loading-indicator">Loading data...</div>}

      {isDataTruncated && (
        <div className="truncation-warning" style={{
          padding: '12px',
          margin: '12px 0',
          backgroundColor: '#fff3cd',
          border: '1px solid #ffc107',
          borderRadius: '4px',
          color: '#856404'
        }}>
          <strong>Performance Notice:</strong> Showing first {MAX_RENDER_ROWS.toLocaleString()} of{' '}
          {isCsvApiMode && csvPagination
            ? csvPagination.totalCount.toLocaleString()
            : groupedData.length.toLocaleString()} rows. Use pagination to view more rows.
        </div>
      )}

      {columnGroups && (
        <div className="column-group-pills-wrapper">
          <div className="column-group-pills-container">
            {Array.from(columnGroups.entries()).map(([prefix]) => (
              <span
                key={prefix}
                className="column-group-pill"
                title={`Group: ${prefix}`}
              >
                {prefix}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="table-container">
        <table className="data-table">
          <thead>
            {columnGroups ? (
              // Render column groups with separators
              <>
                <tr>
                  {columns.map((column) => (
                    <th
                      key={column}
                      onClick={() => handleSort(column)}
                      className={
                        sortColumn === column ? `sorted ${sortDirection}` : ''
                      }
                      title={column}
                    >
                      <span className="column-header">
                        {isCsvApiMode || isCsvData(data)
                          ? column
                          : column.replace('attr:', '')}
                      </span>
                      {sortColumn === column && (
                        <span className="sort-indicator">
                          {sortDirection === 'asc' ? ' ↑' : ' ↓'}
                        </span>
                      )}
                    </th>
                  ))}
                </tr>
              </>
            ) : (
              // Standard header without grouping
              <tr>
                {columns.map((column) => (
                  <th
                    key={column}
                    onClick={() => handleSort(column)}
                    className={
                      sortColumn === column ? `sorted ${sortDirection}` : ''
                    }
                    title={column}
                  >
                    <span className="column-header">
                      {isCsvApiMode || isCsvData(data)
                        ? column
                        : column.replace('attr:', '')}
                    </span>
                    {sortColumn === column && (
                      <span className="sort-indicator">
                        {sortDirection === 'asc' ? ' ↑' : ' ↓'}
                      </span>
                    )}
                  </th>
                ))}
              </tr>
            )}
          </thead>
          <tbody>
            {renderedData.map((record, index) => {
              const isGroupStart = (record as { _groupStart?: boolean })._groupStart;
              const personId = (record as { _personId?: string })._personId;

              return (
                <React.Fragment key={`fragment-${index}`}>
                  {isGroupStart && (
                    <tr
                      key={`group-sep-${index}-${personId}`}
                      className="person-group-separator-row"
                      data-person-id={personId || undefined}
                    >
                      <td
                        colSpan={columns.length}
                        className="person-group-separator"
                        title={`Person ID: ${personId}`}
                      >
                        <span className="person-group-label">
                          Person: {personId || 'Unknown'}
                        </span>
                      </td>
                    </tr>
                  )}
                  <tr
                    key={`row-${index}`}
                    className={isGroupStart ? 'person-group-start' : ''}
                    data-person-id={personId || undefined}
                  >
                    {columns.map((column) => (
                      <td key={column}>{getCellValue(record, column)}</td>
                    ))}
                  </tr>
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination and summary controls at the bottom */}
      <div className="table-controls table-controls-bottom">
        <span className="table-count">
          {isCsvApiMode && csvPagination ? (
            <>
              {isDataTruncated ? (
                <>
                  Showing 1-{MAX_RENDER_ROWS.toLocaleString()} of{' '}
                  {csvPagination.totalCount.toLocaleString()} rows ({MAX_RENDER_ROWS.toLocaleString()}{' '}
                  rendered for performance)
                </>
              ) : (
                <>
                  Showing {csvPagination.pageSize * (csvPagination.page - 1) + 1}-
                  {Math.min(
                    csvPagination.pageSize * csvPagination.page,
                    csvPagination.totalCount
                  )}{' '}
                  of {csvPagination.totalCount.toLocaleString()} rows
                </>
              )}
            </>
          ) : (
            <>
              {isDataTruncated ? (
                <>
                  Showing 1-{MAX_RENDER_ROWS.toLocaleString()} of{' '}
                  {groupedData.length.toLocaleString()} rows ({MAX_RENDER_ROWS.toLocaleString()}{' '}
                  rendered for performance)
                  {filterText && ` (filtered)`}
                </>
              ) : (
                <>
                  Showing {sortedData.length} of {displayData.length} rows
                  {filterText && ` (filtered)`}
                </>
              )}
            </>
          )}
        </span>
        {columns.length > 0 && (
          <span className="table-count">({columns.length} columns shown)</span>
        )}
        {isCsvApiMode && csvPagination && onPageSizeChange && (
          <div className="page-size-selector">
            <label htmlFor="page-size-select" className="page-size-label">
              Rows per page:
            </label>
            <select
              id="page-size-select"
              value={currentPageSizeValue}
              onChange={(e) => {
                const value = e.target.value;
                // Prevent selecting "all" if dataset is too large
                if (value === 'all' && csvPagination.totalCount > MAX_RENDER_ROWS) {
                  return;
                }
                if (value === 'all') {
                  onPageSizeChange('all');
                } else {
                  onPageSizeChange(Number.parseInt(value, 10));
                }
              }}
              disabled={loading}
              className="page-size-select"
            >
              <option value="50">50</option>
              <option value="100">100</option>
              <option value="250">250</option>
              <option value="500">500</option>
              <option
                value="all"
                disabled={csvPagination.totalCount > MAX_RENDER_ROWS}
                title={
                  csvPagination.totalCount > MAX_RENDER_ROWS
                    ? `Disabled for datasets larger than ${MAX_RENDER_ROWS.toLocaleString()} rows to prevent performance issues. Use pagination to view all data.`
                    : undefined
                }
              >
                All
              </option>
            </select>
          </div>
        )}
        {isCsvApiMode && csvPagination && csvPagination.totalPages > 1 && (
          <div className="pagination-controls">
            <button
              onClick={() => handlePageChange(csvPagination.page - 1)}
              disabled={csvPagination.page === 1 || loading}
              className="pagination-button"
            >
              Previous
            </button>
            <span className="pagination-info">
              Page {csvPagination.page} of {csvPagination.totalPages}
            </span>
            <button
              onClick={() => handlePageChange(csvPagination.page + 1)}
              disabled={
                csvPagination.page === csvPagination.totalPages || loading
              }
              className="pagination-button"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}