import './Sidebar.css';

type DataMode = 'xml' | 'csv';
type ViewMode = 'tree' | 'table' | 'count';

interface SidebarProps {
  dataMode: DataMode;
  viewMode: ViewMode;
  hasData: boolean;
  hasXmlData: boolean;
  onDataModeChange: (mode: DataMode) => void;
  onViewModeChange: (mode: ViewMode) => void;
  onExportCSV?: () => void;
  onExportJSON?: () => void;
  onReset: () => void;
}

export default function Sidebar({
  dataMode,
  viewMode,
  hasData,
  hasXmlData,
  onDataModeChange,
  onViewModeChange,
  onExportCSV,
  onExportJSON,
  onReset,
}: SidebarProps) {
  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <h2>Data Visualizer</h2>
        <p className="sidebar-subtitle">Explore your data</p>
      </div>

      <nav className="sidebar-nav">
        <div className="nav-section">
          <h3 className="nav-section-title">File Type</h3>
          <div className="nav-buttons">
            <button
              className={`nav-button ${dataMode === 'xml' ? 'active' : ''}`}
              onClick={() => onDataModeChange('xml')}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M4 7h16M4 12h16M4 17h16" />
              </svg>
              XML
            </button>
            <button
              className={`nav-button ${dataMode === 'csv' ? 'active' : ''}`}
              onClick={() => onDataModeChange('csv')}
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
              CSV
            </button>
          </div>
        </div>

        {hasData && (
          <>
            <div className="nav-section">
              <h3 className="nav-section-title">View</h3>
              <div className="nav-buttons">
                <button
                  className={`nav-button ${viewMode === 'tree' ? 'active' : ''}`}
                  onClick={() => onViewModeChange('tree')}
                  disabled={dataMode === 'csv'}
                  title={
                    dataMode === 'csv'
                      ? 'Tree view not available for CSV'
                      : 'Tree View'
                  }
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                  Tree
                </button>
                <button
                  className={`nav-button ${viewMode === 'table' ? 'active' : ''}`}
                  onClick={() => onViewModeChange('table')}
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
                  Table
                </button>
                <button
                  className={`nav-button ${viewMode === 'count' ? 'active' : ''}`}
                  onClick={() => onViewModeChange('count')}
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M9 2v20M15 2v20M3 9h18M3 15h18" />
                    <circle cx="9" cy="9" r="2" />
                    <circle cx="15" cy="15" r="2" />
                  </svg>
                  Count
                </button>
              </div>
            </div>

            {hasXmlData && (
              <div className="nav-section">
                <h3 className="nav-section-title">Export</h3>
                <div className="nav-buttons">
                  <button className="nav-button" onClick={onExportCSV}>
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="7 10 12 15 17 10" />
                      <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                    Export CSV
                  </button>
                  <button className="nav-button" onClick={onExportJSON}>
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="7 10 12 15 17 10" />
                      <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                    Export JSON
                  </button>
                </div>
              </div>
            )}

            <div className="nav-section">
              <button className="nav-button reset-button" onClick={onReset}>
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
                  <path d="M21 3v5h-5" />
                  <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
                  <path d="M3 21v-5h5" />
                </svg>
                Upload New File
              </button>
            </div>
          </>
        )}
      </nav>
    </aside>
  );
}
