import { useState, useCallback } from 'react';
import axios from 'axios';
import { CsvImportResponse, CsvRowsResponse } from '../types/csv';

const API_BASE_URL = '/api/csv';

export function useCsvData() {
  const [importId, setImportId] = useState<number | null>(null);
  const [importData, setImportData] = useState<CsvImportResponse | null>(null);
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 100,
    totalCount: 0,
    totalPages: 0,
  });

  const fetchRows = useCallback(
    async (id: number, page: number = 1, pageSize: number = 100) => {
      if (!id) return;

      setLoading(true);
      setError(null);

      try {
        const response = await axios.get<CsvRowsResponse>(
          `${API_BASE_URL}/imports/${id}/rows`,
          {
            params: {
              page,
              page_size: pageSize,
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
  }, [fetchRows]);

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

  const goToPage = useCallback(
    (page: number) => {
      if (importId) {
        fetchRows(importId, page, pagination.pageSize);
      }
    },
    [importId, pagination.pageSize, fetchRows]
  );

  const reset = useCallback(() => {
    setImportId(null);
    setImportData(null);
    setRows([]);
    setLoading(false);
    setError(null);
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
    uploadFiles,
    fetchRows,
    searchRows,
    goToPage,
    reset,
  };
}
