import { useState, useCallback } from 'react';
import axios from 'axios';
import { XmlParseResponse, XmlNode } from '../types/xml';

const API_BASE_URL = '/api/xml';

export function useXmlData() {
  const [xmlData, setXmlData] = useState<XmlParseResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<XmlNode[]>([]);

  const uploadFile = useCallback(async (file: File) => {
    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await axios.post<XmlParseResponse>(
        `${API_BASE_URL}/parse`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      setXmlData(response.data);
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setError(
          err.response?.data?.detail || 'Failed to parse XML file. Please check the file format.'
        );
      } else {
        setError('An unexpected error occurred');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const search = useCallback(
    async (query: string, searchIn: string[] = ['tag', 'attribute', 'text']) => {
      if (!xmlData) {
        return;
      }

      try {
        const response = await axios.post<XmlNode[]>(`${API_BASE_URL}/search`, {
          root: xmlData.root,
          search_request: {
            query,
            search_in: searchIn,
          },
        });

        setSearchResults(response.data);
      } catch (err) {
        console.error('Search failed:', err);
        setSearchResults([]);
      }
    },
    [xmlData]
  );

  const reset = useCallback(() => {
    setXmlData(null);
    setLoading(false);
    setError(null);
    setSearchResults([]);
  }, []);

  return {
    xmlData,
    loading,
    error,
    searchResults,
    uploadFile,
    search,
    reset,
  };
}

