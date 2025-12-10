# XML Data Visualizer

A web-based tool for visually exploring, searching, and analyzing XML files without coding. Built for data analysts, product managers, and developers who need to rapidly understand complex XML data structures.

## Features

- **File Upload**: Drag-and-drop or file picker for XML files (up to 50MB)
- **Tree View**: Interactive tree for exploring XML hierarchy with expandable/collapsible nodes
- **Table View**: Flattened, searchable table of XML elements and attributes
- **Search & Filter**: Real-time filter/search by tag, attribute, or value
- **Export**: Export filtered data to CSV or JSON
- **XPath Copy**: Copy XPath or node path to clipboard

## Technology Stack

- **Frontend**: React 18+ with TypeScript, Vite
- **Backend**: Python 3.11+ with FastAPI
- **Testing**: Jest + React Testing Library (frontend), pytest (backend)

## Project Structure

```
xml-data-visualizer/
├── frontend/          # React SPA
├── backend/           # FastAPI service
├── scripts/           # Standalone Python utilities
├── prds/              # Product requirements
└── tasks/             # Task tracking
```

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

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

The frontend will be available at `http://localhost:5173`.

### Standalone Python Script

The standalone XML processor script can be used for command-line XML processing:

```bash
python scripts/xml_processor.py scripts/sample.xml --format=json
python scripts/xml_processor.py scripts/sample.xml --format=flatten
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

- `POST /api/xml/parse` - Upload and parse XML file
- `POST /api/xml/parse-string` - Parse XML string
- `POST /api/xml/flatten` - Flatten XML structure
- `POST /api/xml/search` - Search XML nodes
- `GET /api/xml/health` - Health check

See `http://localhost:8000/docs` for interactive API documentation.

## Project Structure

```
xml-data-visualizer/
├── frontend/              # React SPA frontend
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── hooks/         # Custom React hooks
│   │   ├── utils/         # Utility functions
│   │   └── types/         # TypeScript types
│   └── package.json
├── backend/               # FastAPI backend
│   ├── routers/           # API routes
│   ├── models/            # Pydantic models
│   ├── utils/             # Utility functions
│   └── main.py            # FastAPI app entry point
├── scripts/                # Standalone Python utilities
│   ├── xml_processor.py   # XML processing script
│   └── sample.xml         # Sample XML file
├── prds/                  # Product requirements
└── README.md
```

## Features Implemented

- ✅ XML file upload (drag-and-drop or file picker)
- ✅ Tree view with expandable/collapsible nodes
- ✅ Table view with sorting and filtering
- ✅ Search functionality (tag, attribute, value)
- ✅ Export to CSV and JSON
- ✅ XPath copying
- ✅ Error handling and validation
- ✅ Responsive design

## Future Enhancements

- Guided onboarding tour
- Dark mode
- Namespace support
- Performance optimizations for very large files

## License

MIT

