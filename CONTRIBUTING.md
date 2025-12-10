# Contributing to XML Data Visualizer

Thank you for your interest in contributing!

## Development Setup

1. Clone the repository
2. Set up the backend (see README.md)
3. Set up the frontend (see README.md)

## Development Workflow

This project follows Test-Driven Development (TDD):

1. Write tests first
2. Implement minimum code to pass tests
3. Refactor while keeping tests green

### Running Tests

**Frontend:**
```bash
cd frontend
npm test
npm run test:watch
npm run test:coverage
```

**Backend:**
```bash
cd backend
pytest
pytest --cov
pytest -v  # verbose output
```

### Code Quality

Before committing:

1. Run tests: `npm test` (frontend) or `pytest` (backend)
2. Check linting: `npm run lint` (frontend)
3. Format code: `npm run format` (frontend)
4. Type check: `npm run type-check` (frontend)

## Code Style

- **Frontend**: TypeScript with strict mode, ESLint, Prettier
- **Backend**: Python with type hints, following PEP 8
- Use meaningful variable and function names
- Add comments only when necessary
- Keep functions small and focused

## Pull Request Process

1. Create a feature branch
2. Write tests for your changes
3. Ensure all tests pass
4. Update documentation if needed
5. Submit a pull request with a clear description

## Questions?

Feel free to open an issue for questions or discussions.

