import React, { useMemo, useState, useEffect } from 'react';
import axios from 'axios';
import { XmlNode } from '../types/xml';
import { CsvData, CsvColumnsResponse, CsvRowsResponse, CsvImportResponse } from '../types/csv';
import { flattenXml } from '../utils/export';
import ColumnSelector from './ColumnSelector';
import './CountView.css';

const API_BASE_URL = '/api/csv';

interface CountViewProps {
  data?: XmlNode | CsvData;
  // CSV API-based data props
  csvRows?: Record<string, string>[];
  csvHeaders?: string[];
  selectedColumns?: Set<string>;
  setSelectedColumns?: (columns: Set<string>) => void;
  columnMetadata?: CsvColumnsResponse | null;
  fetchColumns?: () => Promise<CsvColumnsResponse | null>;
  importId?: number | null;
  importData?: CsvImportResponse | null;
}

interface FieldCount {
  value: string;
  count: number;
}

interface FieldCounts {
  field: string;
  counts: FieldCount[];
  totalUnique: number;
}

export default function CountView({
  data,
  csvRows,
  csvHeaders,
  selectedColumns,
  setSelectedColumns,
  columnMetadata,
  fetchColumns,
  importId,
  importData,
}: CountViewProps) {
  const [showColumnSelector, setShowColumnSelector] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(new Set());
  // Pagination state for CountView
  const [countPage, setCountPage] = useState(1);
  const [countPageSize, setCountPageSize] = useState(100);
  const [countPagination, setCountPagination] = useState<{
    page: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
  } | null>(null);
  const [countRows, setCountRows] = useState<Record<string, string>[]>([]);
  const [loadingCountData, setLoadingCountData] = useState(false);
  const [countError, setCountError] = useState<string | null>(null);

  const isCsvData = (d?: XmlNode | CsvData): d is CsvData => {
    return d !== undefined && 'headers' in d && 'rows' in d;
  };

  const isCsvApiMode = csvRows !== undefined && csvHeaders !== undefined;

  // Fetch count data for current page when in CSV API mode
  useEffect(() => {
    // Clear previous data when importId changes
    if (importId === null) {
      setCountRows([]);
      setCountPagination(null);
      setCountError(null);
      setCountPage(1);
      return;
    }

    if (isCsvApiMode && importId) {
      const fetchCountData = async () => {
        setLoadingCountData(true);
        setCountError(null);

        try {
          const response = await axios.get<CsvRowsResponse>(
            `${API_BASE_URL}/imports/${importId}/rows`,
            {
              params: {
                page: countPage,
                page_size: countPageSize,
              },
            }
          );

          setCountRows(response.data.rows);
          setCountPagination({
            page: response.data.page,
            pageSize: response.data.page_size,
            totalCount: response.data.total_count,
            totalPages: response.data.total_pages,
          });
        } catch (err) {
          if (axios.isAxiosError(err)) {
            setCountError(err.response?.data?.detail || 'Failed to fetch count data');
          } else {
            setCountError('An unexpected error occurred');
          }
        } finally {
          setLoadingCountData(false);
        }
      };

      fetchCountData();
    }
  }, [isCsvApiMode, importId, countPage, countPageSize]);

  // Fetch columns metadata when CSV data is loaded
  useEffect(() => {
    if (isCsvApiMode && importId && fetchColumns && !columnMetadata) {
      fetchColumns();
    }
  }, [importId, fetchColumns, columnMetadata, isCsvApiMode]);

  // Freeze background scrolling when modal is open
  useEffect(() => {
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
  const effectiveSelectedColumns = useMemo(() => {
    if (isCsvApiMode && selectedColumns && selectedColumns.size > 0) {
      return selectedColumns;
    }
    return visibleColumns;
  }, [isCsvApiMode, selectedColumns, visibleColumns]);

  // Get available columns
  const columns = useMemo(() => {
    if (isCsvApiMode) {
      const allCols = csvHeaders || [];
      if (effectiveSelectedColumns.size > 0) {
        return Array.from(effectiveSelectedColumns);
      }
      // If no selection, show first 100 columns or all if less than 100
      if (allCols.length > 100) {
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
      const allCols = data.headers;
      if (effectiveSelectedColumns.size > 0) {
        return Array.from(effectiveSelectedColumns);
      }
      if (allCols.length > 100) {
        const limited = allCols.slice(0, 100);
        setVisibleColumns(new Set(limited));
        return limited;
      }
      return allCols;
    } else if (data) {
      // XML mode - extract columns from flattened data
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
    setSelectedColumns,
  ]);

  // Get data to process - use countRows for CSV API mode (paginated)
  const displayData = useMemo(() => {
    if (isCsvApiMode) {
      // Use countRows (paginated data for counting)
      const rowsToUse = countRows.length > 0 ? countRows : [];
      return rowsToUse.map((row) => ({
        path: '',
        tag: '',
        text: '',
        attributes: row,
      }));
    } else if (isCsvData(data)) {
      return data.rows.map((row) => ({
        path: '',
        tag: '',
        text: '',
        attributes: row.data,
      }));
    } else if (data) {
      return flattenXml(data);
    }
    return [];
  }, [data, countRows, isCsvApiMode]);

  // Calculate unique counts for each field
  const fieldCounts = useMemo(() => {
    if (columns.length === 0 || displayData.length === 0) {
      return [];
    }

    const counts: FieldCounts[] = [];

    for (const column of columns) {
      const valueCounts = new Map<string, number>();

      for (const record of displayData) {
        let value: string | null = null;

        if (isCsvApiMode || isCsvData(data)) {
          value = record.attributes?.[column] || '';
        } else {
          // XML mode
          if (column === 'path') {
            value = record.path;
          } else if (column === 'tag') {
            value = record.tag;
          } else if (column === 'text') {
            value = record.text || '';
          } else if (column.startsWith('attr:')) {
            const attrName = column.replace('attr:', '');
            value = record.attributes?.[attrName] || '';
          }
        }

        // Handle null/empty values
        const displayValue =
          value === null || value === '' ? '(empty)' : String(value);
        valueCounts.set(displayValue, (valueCounts.get(displayValue) || 0) + 1);
      }

      // Convert to array and sort by count (descending), then by value (ascending)
      const countsArray: FieldCount[] = Array.from(valueCounts.entries())
        .map(([value, count]) => ({ value, count }))
        .sort((a, b) => {
          if (b.count !== a.count) {
            return b.count - a.count;
          }
          return a.value.localeCompare(b.value);
        });

      counts.push({
        field: column,
        counts: countsArray,
        totalUnique: countsArray.length,
      });
    }

    return counts;
  }, [columns, displayData, data, isCsvApiMode]);

  const handleColumnSelectionChange = (newSelection: Set<string>) => {
    if (setSelectedColumns) {
      setSelectedColumns(newSelection);
    } else {
      setVisibleColumns(newSelection);
    }
  };

  const getFieldDisplayName = (field: string): string => {
    if (isCsvApiMode || isCsvData(data)) {
      return field;
    }
    return field.replace('attr:', '');
  };

  const handleCountPageChange = (newPage: number) => {
    if (countPagination && newPage >= 1 && newPage <= countPagination.totalPages) {
      setCountPage(newPage);
    }
  };

  const handleCountPageSizeChange = (newPageSize: number) => {
    setCountPageSize(newPageSize);
    setCountPage(1); // Reset to first page when page size changes
  };

  return (
    <div className="count-view">
      <div className="count-controls">
        {isCsvApiMode && columnMetadata && (
          <button
            onClick={() => setShowColumnSelector(true)}
            className="column-selector-button"
            title="Select columns to count"
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
        <span className="count-info">
          {loadingCountData
            ? `Loading page ${countPage}...`
            : countError
              ? `Error: ${countError}`
              : fieldCounts.length > 0
                ? countPagination
                  ? `Showing counts for ${fieldCounts.length} field${fieldCounts.length !== 1 ? 's' : ''} (page ${countPagination.page} of ${countPagination.totalPages}, rows ${countPagination.pageSize * (countPagination.page - 1) + 1}-${Math.min(countPagination.pageSize * countPagination.page, countPagination.totalCount)} of ${countPagination.totalCount.toLocaleString()})`
                  : `Showing counts for ${fieldCounts.length} field${fieldCounts.length !== 1 ? 's' : ''} (${displayData.length.toLocaleString()} rows)`
                : 'No fields selected'}
        </span>
        {isCsvApiMode && countPagination && (
          <div className="count-pagination-controls">
            <div className="count-page-size-selector">
              <label htmlFor="count-page-size-select" className="count-page-size-label">
                Rows per page:
              </label>
              <select
                id="count-page-size-select"
                value={countPageSize}
                onChange={(e) => handleCountPageSizeChange(Number.parseInt(e.target.value, 10))}
                disabled={loadingCountData}
                className="count-page-size-select"
              >
                <option value="50">50</option>
                <option value="100">100</option>
                <option value="250">250</option>
                <option value="500">500</option>
              </select>
            </div>
            {countPagination.totalPages > 1 && (
              <div className="count-pagination-buttons">
                <button
                  onClick={() => handleCountPageChange(countPagination.page - 1)}
                  disabled={countPagination.page === 1 || loadingCountData}
                  className="count-pagination-button"
                >
                  Previous
                </button>
                <span className="count-pagination-info">
                  Page {countPagination.page} of {countPagination.totalPages}
                </span>
                <button
                  onClick={() => handleCountPageChange(countPagination.page + 1)}
                  disabled={
                    countPagination.page === countPagination.totalPages || loadingCountData
                  }
                  className="count-pagination-button"
                >
                  Next
                </button>
              </div>
            )}
          </div>
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

      {loadingCountData ? (
        <div className="count-empty-state">
          <p>Loading data for counting...</p>
        </div>
      ) : countError ? (
        <div className="count-empty-state">
          <p>Error loading data: {countError}</p>
          <p>Please try refreshing the page.</p>
        </div>
      ) : fieldCounts.length === 0 ? (
        <div className="count-empty-state">
          <p>No fields selected for counting.</p>
          <p>Use the Columns button to select fields to analyze.</p>
        </div>
      ) : (
        <div className="count-results">
          {fieldCounts.map((fieldCount) => (
            <div key={fieldCount.field} className="count-field-section">
              <div className="count-field-header">
                <h3 className="count-field-name">
                  {getFieldDisplayName(fieldCount.field)}
                </h3>
                <span className="count-field-total">
                  {fieldCount.totalUnique} unique value
                  {fieldCount.totalUnique !== 1 ? 's' : ''}
                </span>
              </div>
              <div className="count-values-list">
                {fieldCount.counts.map((item, index) => (
                  <div
                    key={`${fieldCount.field}-${index}`}
                    className="count-value-item"
                  >
                    <span className="count-value">{item.value}</span>
                    <span className="count-number">({item.count})</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
