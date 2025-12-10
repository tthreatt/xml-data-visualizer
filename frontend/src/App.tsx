import { useState, useCallback } from 'react';
import FileUpload from './components/FileUpload';
import TreeView from './components/TreeView';
import TableView from './components/TableView';
import SearchBar from './components/SearchBar';
import Sidebar from './components/Sidebar';
import { useXmlData } from './hooks/useXmlData';
import { useCsvData } from './hooks/useCsvData';
import { exportToCSV, exportToJSON } from './utils/export';
import './App.css';

type DataMode = 'xml' | 'csv';

function App() {
  const [dataMode, setDataMode] = useState<DataMode>('xml');
  const { xmlData, loading: xmlLoading, error: xmlError, uploadFile: uploadXmlFile, reset: resetXml } = useXmlData();
  const {
    importId,
    importData,
    rows: csvRows,
    loading: csvLoading,
    error: csvError,
    uploadFiles: uploadCsvFiles,
    pagination: csvPagination,
    goToPage: csvGoToPage,
    reset: resetCsv,
  } = useCsvData();
  const [viewMode, setViewMode] = useState<'tree' | 'table'>('tree');

  const loading = dataMode === 'xml' ? xmlLoading : csvLoading;
  const error = dataMode === 'xml' ? xmlError : csvError;
  const hasData = dataMode === 'xml' ? xmlData !== null : importId !== null;
  const hasXmlData = xmlData !== null;

  const handleUpload = (file: File) => {
    if (dataMode === 'xml') {
      uploadXmlFile(file);
    }
  };

  const handleUploadMultiple = (files: File[]) => {
    if (dataMode === 'csv') {
      uploadCsvFiles(files);
    }
  };

  const handleDataModeChange = useCallback((mode: DataMode) => {
    setDataMode(mode);
    // If switching modes, reset view to table for CSV
    if (mode === 'csv') {
      setViewMode('table');
    }
  }, []);

  const handleReset = useCallback(() => {
    // Reset state by clearing data
    resetXml();
    resetCsv();
    setViewMode('tree');
  }, [resetXml, resetCsv]);

  const handleExportCSV = useCallback(() => {
    if (xmlData) {
      exportToCSV(xmlData.root);
    }
  }, [xmlData]);

  const handleExportJSON = useCallback(() => {
    if (xmlData) {
      exportToJSON(xmlData.root);
    }
  }, [xmlData]);

  return (
    <div className="app">
      {hasData && (
        <Sidebar
          dataMode={dataMode}
          viewMode={viewMode}
          hasData={hasData}
          hasXmlData={hasXmlData}
          onDataModeChange={handleDataModeChange}
          onViewModeChange={setViewMode}
          onExportCSV={handleExportCSV}
          onExportJSON={handleExportJSON}
          onReset={handleReset}
        />
      )}

      <main className={`app-main ${hasData ? 'with-sidebar' : ''}`}>
        {!hasData ? (
          <div className="upload-container">
            <div className="mode-toggle">
              <button
                className={dataMode === 'xml' ? 'active' : ''}
                onClick={() => setDataMode('xml')}
              >
                XML Mode
              </button>
              <button
                className={dataMode === 'csv' ? 'active' : ''}
                onClick={() => setDataMode('csv')}
              >
                CSV Mode
              </button>
            </div>
            <FileUpload
              onUpload={handleUpload}
              onUploadMultiple={dataMode === 'csv' ? handleUploadMultiple : undefined}
              loading={loading}
              error={error}
              fileType={dataMode}
              multiple={dataMode === 'csv'}
            />
          </div>
        ) : (
          <>
            <div className="content-header">
              <SearchBar dataMode={dataMode} />
            </div>

            {importData && (
              <div className="large-dataset-notice">
                <p>
                  <strong>CSV Data Loaded</strong>
                </p>
                <p>
                  {importData.total_rows.toLocaleString()} rows, {importData.total_columns} columns
                </p>
                <p className="notice-subtle">
                  Use Table View to explore the data with pagination and filtering.
                </p>
              </div>
            )}

            {viewMode === 'tree' ? (
              dataMode === 'xml' && xmlData ? (
                <TreeView data={xmlData.root} />
              ) : importData ? (
                <div className="tree-view-message">
                  <p>Tree view is not available for CSV data.</p>
                  <p>CSV data is tabular - each row represents a separate record.</p>
                  <p>Please use Table View to explore the data.</p>
                </div>
              ) : null
            ) : (
              dataMode === 'xml' && xmlData ? (
                <TableView data={xmlData.root} />
              ) : importData && csvRows ? (
                <TableView
                  csvRows={csvRows}
                  csvHeaders={importData.headers}
                  csvPagination={csvPagination}
                  onPageChange={csvGoToPage}
                  loading={csvLoading}
                />
              ) : null
            )}
          </>
        )}
      </main>
    </div>
  );
}

export default App;

