# XML & CSV Data Visualizer

A web-based tool for visually exploring, searching, and analyzing XML and CSV files without coding. Built for data analysts, product managers, and developers who need to rapidly understand complex data structures.

## Features

### XML Features
- **File Upload**: Drag-and-drop or file picker for XML files (up to 50MB)
- **Tree View**: Interactive tree for exploring XML hierarchy with expandable/collapsible nodes
- **Table View**: Flattened, searchable table of XML elements and attributes
- **Search & Filter**: Real-time filter/search by tag, attribute, or value
- **Export**: Export filtered data to CSV or JSON
- **XPath Copy**: Copy XPath or node path to clipboard

### CSV Features
- **File Upload**: Single or batch upload for CSV files (up to 100MB per file)
- **Database Storage**: CSV data stored in SQLite database for efficient handling of large datasets
- **Table View**: Paginated table view with filtering and sorting for CSV data
- **Pagination**: Efficient pagination for large CSV datasets
- **Search & Filter**: Real-time search and filtering across CSV columns
- **Batch Processing**: Upload and combine multiple CSV files in a single operation

## Technology Stack

- **Frontend**: React 18+ with TypeScript, Vite
- **Backend**: Python 3.11+ with FastAPI
- **Database**: SQLite with SQLAlchemy ORM (for CSV data storage)
- **Testing**: Jest + React Testing Library (frontend), pytest (backend)


## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Python 3.11+
- Git

### Backend Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at `http://localhost:8000` with interactive docs at `http://localhost:8000/docs`.

**Note**: The database (SQLite) is automatically initialized on application startup. CSV data is stored in `backend/data/csv_data.db`.

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

The frontend will be available at `http://localhost:5173`.

### Standalone Python Scripts

The standalone processor scripts can be used for command-line data processing:

**XML Processing:**
```bash
python scripts/xml_processor.py scripts/sample.xml --format=json
python scripts/xml_processor.py scripts/sample.xml --format=flatten
```

**CSV Processing:**
```bash
python scripts/csv_processor.py path/to/file.csv
```

## Development

This project follows Test-Driven Development (TDD) practices:

1. Write tests first
2. Implement minimum code to pass tests
3. Refactor while keeping tests green

### Running Tests

**Frontend:**
```bash
cd frontend
npm test
npm run test:coverage
```

**Backend:**
```bash
cd backend
pytest
pytest --cov
```

### Code Quality

- **Linting**: `npm run lint` (frontend)
- **Formatting**: `npm run format` (frontend)
- **Type Checking**: `npm run type-check` (frontend)

## API Endpoints

### XML Endpoints

- `POST /api/xml/parse` - Upload and parse XML file (up to 50MB)
- `POST /api/xml/parse-string` - Parse XML string
- `POST /api/xml/flatten` - Flatten XML structure
- `POST /api/xml/search` - Search XML nodes
- `GET /api/xml/health` - Health check

### CSV Endpoints

- `POST /api/csv/parse-batch` - Batch upload and parse multiple CSV files (up to 100MB per file)
- `POST /api/csv/parse` - Parse single CSV file
- `POST /api/csv/search` - Search CSV data
- `GET /api/csv/imports/{import_id}` - Get CSV import details
- `GET /api/csv/imports/{import_id}/rows` - Get paginated CSV rows
- `POST /api/csv/imports/{import_id}/search` - Search CSV with pagination
- `GET /api/csv/health` - Health check

See `http://localhost:8000/docs` for interactive API documentation.

## Project Structure

```
xml-data-visualizer/
├── frontend/              # React SPA frontend
│   ├── src/
│   │   ├── components/    # React components (FileUpload, TreeView, TableView, etc.)
│   │   ├── hooks/         # Custom React hooks (useXmlData, useCsvData)
│   │   ├── utils/         # Utility functions (export, etc.)
│   │   ├── types/         # TypeScript types (xml.ts, csv.ts)
│   │   └── __tests__/     # Frontend tests
│   └── package.json
├── backend/               # FastAPI backend
│   ├── routers/           # API routes
│   │   ├── xml_parser.py   # XML API endpoints
│   │   └── csv_parser.py  # CSV API endpoints
│   ├── models/            # Pydantic models
│   │   ├── xml_models.py  # XML data models
│   │   ├── csv_models.py  # CSV data models
│   │   └── db_models.py   # Database models
│   ├── services/          # Business logic services
│   │   ├── csv_storage.py # CSV database storage
│   │   └── csv_query.py   # CSV query operations
│   ├── utils/             # Utility functions
│   │   ├── xml_processor.py  # XML processing logic
│   │   └── csv_processor.py  # CSV processing logic
│   ├── data/              # Database storage directory
│   │   └── csv_data.db    # SQLite database file
│   ├── __tests__/         # Backend tests
│   ├── database.py        # Database connection and setup
│   ├── main.py            # FastAPI app entry point
│   └── requirements.txt   # Python dependencies
├── scripts/               # Standalone Python utilities
│   ├── xml_processor.py   # XML processing script
│   ├── csv_processor.py   # CSV processing script
│   └── sample.xml         # Sample XML file
├── prds/                  # Product requirements
└── README.md
```

## Features Implemented

### XML Features
- ✅ XML file upload (drag-and-drop or file picker)
- ✅ Tree view with expandable/collapsible nodes
- ✅ Table view with sorting and filtering
- ✅ Search functionality (tag, attribute, value)
- ✅ Export to CSV and JSON
- ✅ XPath copying
- ✅ Error handling and validation

### CSV Features
- ✅ CSV file upload (single and batch)
- ✅ CSV data storage in SQLite database
- ✅ Pagination for large CSV datasets
- ✅ Table view with filtering and sorting
- ✅ Search functionality across CSV columns
- ✅ Batch CSV file processing

### General Features
- ✅ Responsive design
- ✅ Error handling and validation
- ✅ File size validation (XML: 50MB, CSV: 100MB per file)

## Future Enhancements

- Guided onboarding tour
- Dark mode
- Namespace support
- Performance optimizations for very large files

## License

MIT

