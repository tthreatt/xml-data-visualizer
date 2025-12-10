import { useState } from 'react';
import { useXmlData } from '../hooks/useXmlData';
import { useCsvData } from '../hooks/useCsvData';
import './SearchBar.css';

interface SearchBarProps {
  dataMode: 'xml' | 'csv';
}

export default function SearchBar({ dataMode }: SearchBarProps) {
  const { search: searchXml } = useXmlData();
  const { searchRows: searchCsv } = useCsvData();
  const [query, setQuery] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      if (dataMode === 'xml') {
        searchXml(query.trim());
      } else {
        searchCsv(query.trim());
      }
    }
  };

  const placeholder =
    dataMode === 'xml'
      ? 'Search by tag, attribute, or value...'
      : 'Search across all columns...';

  return (
    <form className="search-bar" onSubmit={handleSearch}>
      <input
        type="text"
        placeholder={placeholder}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="search-input"
      />
      <button type="submit" className="search-button">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.35-4.35" />
        </svg>
        Search
      </button>
    </form>
  );
}

