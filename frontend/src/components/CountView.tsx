import React, { useMemo, useState, useEffect } from 'react';
import { XmlNode } from '../types/xml';
import { CsvData, CsvColumnsResponse } from '../types/csv';
import { flattenXml } from '../utils/export';
import ColumnSelector from './ColumnSelector';
import './CountView.css';

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
}: CountViewProps) {
  const [showColumnSelector, setShowColumnSelector] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(new Set());

  const isCsvData = (d?: XmlNode | CsvData): d is CsvData => {
    return d !== undefined && 'headers' in d && 'rows' in d;
  };

  const isCsvApiMode = csvRows !== undefined && csvHeaders !== undefined;

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

  // Get data to process
  const displayData = useMemo(() => {
    if (isCsvApiMode) {
      return csvRows.map((row) => ({
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
  }, [data, csvRows, isCsvApiMode]);

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
          {fieldCounts.length > 0
            ? `Showing counts for ${fieldCounts.length} field${fieldCounts.length !== 1 ? 's' : ''}`
            : 'No fields selected'}
        </span>
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

      {fieldCounts.length === 0 ? (
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
