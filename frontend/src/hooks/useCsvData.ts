import { useState, useCallback, useEffect } from 'react';
import axios from 'axios';
import { CsvImportResponse, CsvRowsResponse, CsvColumnsResponse } from '../types/csv';

const API_BASE_URL = '/api/csv';

export function useCsvData() {
  const [importId, setImportId] = useState<number | null>(null);
  const [importData, setImportData] = useState<CsvImportResponse | null>(null);
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedColumns, setSelectedColumns] = useState<Set<string>>(new Set());
  const [columnMetadata, setColumnMetadata] = useState<CsvColumnsResponse | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 100,
    totalCount: 0,
    totalPages: 0,
  });

  const fetchRows = useCallback(
    async (id: number, page: number = 1, pageSize: number = 100, columns?: string[]) => {
      if (!id) return;

      setLoading(true);
      setError(null);

      try {
        const params: Record<string, any> = {
          page,
          page_size: pageSize,
        };
        
        // Only include columns param if columns are specified and not empty
        if (columns && columns.length > 0) {
          params.columns = columns;
        }

        const response = await axios.get<CsvRowsResponse>(
          `${API_BASE_URL}/imports/${id}/rows`,
          { params }
        );

        setRows(response.data.rows);
        setPagination({
          page: response.data.page,
          pageSize: response.data.page_size,
          totalCount: response.data.total_count,
          totalPages: response.data.total_pages,
        });
      } catch (err) {
        if (axios.isAxiosError(err)) {
          setError(err.response?.data?.detail || 'Failed to fetch rows');
        } else {
          setError('An unexpected error occurred');
        }
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const fetchColumns = useCallback(
    async (id: number, prefix?: string) => {
      if (!id) return null;

      try {
        const params: Record<string, any> = {};
        if (prefix) {
          params.prefix = prefix;
        }

        const response = await axios.get<CsvColumnsResponse>(
          `${API_BASE_URL}/imports/${id}/columns`,
          { params }
        );

        setColumnMetadata(response.data);
        return response.data;
      } catch (err) {
        if (axios.isAxiosError(err)) {
          setError(err.response?.data?.detail || 'Failed to fetch columns');
        } else {
          setError('An unexpected error occurred');
        }
        return null;
      }
    },
    []
  );

  const uploadFiles = useCallback(async (files: File[]) => {
    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      files.forEach((file) => {
        formData.append('files', file);
      });

      const response = await axios.post<CsvImportResponse>(
        `${API_BASE_URL}/parse-batch`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      setImportId(response.data.import_id);
      setImportData(response.data);
      
      // Fetch columns metadata
      await fetchColumns(response.data.import_id);
      
      // Fetch first page of rows
      await fetchRows(response.data.import_id, 1, 100);
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setError(
          err.response?.data?.detail || 'Failed to parse CSV files. Please check the file format.'
        );
      } else {
        setError('An unexpected error occurred');
      }
    } finally {
      setLoading(false);
    }
  }, [fetchRows, fetchColumns]);

  const searchRows = useCallback(
    async (query: string, columns?: string[]) => {
      if (!importId || !query) return;

      setLoading(true);
      setError(null);

      try {
        const response = await axios.post<CsvRowsResponse>(
          `${API_BASE_URL}/imports/${importId}/search`,
          null,
          {
            params: {
              query,
              columns: columns?.join(','),
              page: 1,
              page_size: 100,
            },
          }
        );

        setRows(response.data.rows);
        setPagination({
          page: response.data.page,
          pageSize: response.data.page_size,
          totalCount: response.data.total_count,
          totalPages: response.data.total_pages,
        });
      } catch (err) {
        if (axios.isAxiosError(err)) {
          setError(err.response?.data?.detail || 'Search failed');
        } else {
          setError('An unexpected error occurred');
        }
      } finally {
        setLoading(false);
      }
    },
    [importId]
  );

  // Refetch data when selected columns change (but not on initial mount)
  useEffect(() => {
    if (importId && pagination.page > 0 && rows.length > 0) {
      const columnsToFetch = selectedColumns.size > 0 ? Array.from(selectedColumns) : undefined;
      fetchRows(importId, pagination.page, pagination.pageSize, columnsToFetch);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedColumns]); // Only refetch when columns change, not on other changes

  const goToPage = useCallback(
    (page: number) => {
      if (importId) {
        const columnsToFetch = selectedColumns.size > 0 ? Array.from(selectedColumns) : undefined;
        fetchRows(importId, page, pagination.pageSize, columnsToFetch);
      }
    },
    [importId, pagination.pageSize, fetchRows, selectedColumns]
  );

  const selectColumnsByPrefix = useCallback((prefix: string) => {
    if (!columnMetadata) return;
    
    const matchingColumns = columnMetadata.columns.filter(col => 
      col.toLowerCase().includes(prefix.toLowerCase())
    );
    setSelectedColumns(new Set(matchingColumns));
  }, [columnMetadata]);

  const reset = useCallback(() => {
    setImportId(null);
    setImportData(null);
    setRows([]);
    setLoading(false);
    setError(null);
    setSelectedColumns(new Set());
    setColumnMetadata(null);
    setPagination({
      page: 1,
      pageSize: 100,
      totalCount: 0,
      totalPages: 0,
    });
  }, []);

  return {
    importId,
    importData,
    rows,
    loading,
    error,
    pagination,
    selectedColumns,
    setSelectedColumns,
    columnMetadata,
    uploadFiles,
    fetchRows,
    fetchColumns,
    searchRows,
    goToPage,
    selectColumnsByPrefix,
    reset,
  };
}
