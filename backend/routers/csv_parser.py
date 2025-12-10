"""
CSV parsing API routes.
"""

import logging
from fastapi import APIRouter, UploadFile, File, HTTPException, Query, Depends
from fastapi.responses import JSONResponse
from typing import List, Optional
from sqlalchemy.orm import Session
import csv
import io

logger = logging.getLogger(__name__)

from models.csv_models import (
    CsvParseResponse,
    CsvData,
    CsvNode,
    CsvSearchRequest,
    CsvImportResponse,
    CsvRowsResponse,
)
from utils.csv_processor import (
    combine_csv_files,
    csv_to_hierarchical,
    search_csv_data,
    validate_csv_size,
    calculate_csv_stats,
)
from database import get_db
from services.csv_storage import store_csv_import, get_csv_import
from services.csv_query import query_csv_rows, search_csv_rows

router = APIRouter(prefix="/api/csv", tags=["csv"])


@router.post("/parse-batch", response_model=CsvImportResponse)
async def parse_csv_batch(
    files: List[UploadFile] = File(...),
    db: Session = Depends(get_db),
):
    """
    Parse and combine multiple uploaded CSV files, then store in database.

    Args:
        files: List of uploaded CSV files
        db: Database session

    Returns:
        CsvImportResponse with import_id and metadata
    """
    if not files:
        raise HTTPException(status_code=400, detail="No files provided")

    # Validate file types
    for file in files:
        if not file.filename or not file.filename.lower().endswith(".csv"):
            raise HTTPException(
                status_code=400, detail=f"File {file.filename} must be a CSV file"
            )

    # Read all file contents
    contents: List[str] = []
    errors: List[str] = []

    for file in files:
        try:
            content = await file.read()
            csv_content = content.decode("utf-8")

            # Validate size (100MB limit per file)
            try:
                validate_csv_size(csv_content, max_size_mb=100)
            except ValueError as e:
                errors.append(f"{file.filename}: {str(e)}")
                continue

            contents.append(csv_content)
        except Exception as e:
            errors.append(f"{file.filename}: Error reading file - {str(e)}")

    if not contents:
        raise HTTPException(
            status_code=400,
            detail=f"Failed to read any CSV files. Errors: {', '.join(errors)}",
        )

    # Combine CSV files
    try:
        combined_data = combine_csv_files(contents)
    except Exception as e:
        raise HTTPException(
            status_code=400, detail=f"Error combining CSV files: {str(e)}"
        )

    # Calculate stats
    total_rows, total_columns = calculate_csv_stats(combined_data)

    # Get file names for metadata
    file_names = [file.filename for file in files if file.filename]

    # Store in database
    try:
        import_id = store_csv_import(db, combined_data, file_names)
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error storing CSV data in database: {str(e)}"
        )

    # Get import record to return status
    csv_import = get_csv_import(db, import_id)

    return CsvImportResponse(
        import_id=import_id,
        total_rows=total_rows,
        total_columns=total_columns,
        headers=combined_data.headers,
        status=csv_import.status,
    )


@router.post("/parse", response_model=CsvParseResponse)
async def parse_csv_file(
    file: UploadFile = File(...),
    limit_rows: Optional[int] = Query(None, description="Limit number of rows to return (for pagination)"),
):
    """
    Parse a single uploaded CSV file.

    Args:
        file: Uploaded CSV file
        limit_rows: Optional limit on number of rows to return (for large datasets)
        skip_tree: If True, skip building tree structure to reduce response size

    Returns:
        CsvParseResponse with parsed CSV structure
    """
    # Validate file type
    if not file.filename or not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="File must be a CSV file")

    # Read file content
    try:
        content = await file.read()
        csv_content = content.decode("utf-8")

        # Validate size (100MB limit)
        try:
            validate_csv_size(csv_content, max_size_mb=100)
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))

        # Process single file (treat as list of one)
        combined_data = combine_csv_files([csv_content])

        # Calculate stats before limiting
        total_rows, total_columns = calculate_csv_stats(combined_data)

        # Limit rows if requested (for pagination)
        if limit_rows is not None and limit_rows > 0:
            limited_rows = combined_data.rows[:limit_rows]
            combined_data = CsvData(
                headers=combined_data.headers,
                rows=limited_rows,
                total_rows=total_rows,  # Keep original total for pagination info
                total_columns=total_columns,
            )

        # Skip hierarchical tree building for CSV - CSV is tabular data
        # Each row represents a separate person/record and should not be combined
        # Tree view doesn't make sense for CSV data structure
        root_node = CsvNode(
            name="root",
            path="/root",
            value=None,
            children=[],
            attributes={},
        )

        return CsvParseResponse(
            data=combined_data,
            root=root_node,
            total_rows=total_rows,
            total_columns=total_columns,
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error processing CSV: {str(e)}")


@router.post("/search")
async def search_csv(request: dict):
    """
    Search CSV data matching query.

    Args:
        request: Dictionary containing 'data' (CsvData) and 'search_request' (CsvSearchRequest)

    Returns:
        List of matching rows
    """
    try:
        from models.csv_models import CsvData, CsvSearchRequest

        csv_data = CsvData(**request.get("data", {}))
        search_request = CsvSearchRequest(**request.get("search_request", {}))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid request format: {str(e)}")

    matches = search_csv_data(csv_data, search_request.query, search_request.search_in)
    return matches


@router.get("/imports/{import_id}", response_model=CsvImportResponse)
async def get_import(import_id: int, db: Session = Depends(get_db)):
    """
    Get CSV import metadata by ID.

    Args:
        import_id: Import session ID
        db: Database session

    Returns:
        CsvImportResponse with import metadata
    """
    try:
        csv_import = get_csv_import(db, import_id)
        return CsvImportResponse(
            import_id=csv_import.id,
            total_rows=csv_import.total_rows,
            total_columns=csv_import.total_columns,
            headers=csv_import.headers,
            status=csv_import.status,
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/imports/{import_id}/rows", response_model=CsvRowsResponse)
async def get_import_rows(
    import_id: int,
    page: int = Query(1, ge=1, description="Page number (1-indexed)"),
    page_size: int = Query(100, ge=1, le=1000, description="Number of rows per page"),
    db: Session = Depends(get_db),
):
    """
    Get paginated rows from a CSV import.

    Args:
        import_id: Import session ID
        page: Page number (1-indexed)
        page_size: Number of rows per page (max 1000)
        db: Database session

    Returns:
        CsvRowsResponse with paginated rows
    """
    try:
        rows, total_count = query_csv_rows(db, import_id, page, page_size)
        total_pages = (total_count + page_size - 1) // page_size

        # Log response structure for debugging
        logger.info(f"API response for import_id={import_id}, page={page}: rows_count={len(rows)}, total_count={total_count}")
        if rows:
            first_row = rows[0]
            logger.info(f"First row in API response: type={type(first_row)}, is_dict={isinstance(first_row, dict)}, keys={list(first_row.keys())[:5] if isinstance(first_row, dict) else 'N/A'}, sample={dict(list(first_row.items())[:3]) if isinstance(first_row, dict) else 'N/A'}")

        return CsvRowsResponse(
            rows=rows,
            total_count=total_count,
            page=page,
            page_size=page_size,
            total_pages=total_pages,
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/imports/{import_id}/search", response_model=CsvRowsResponse)
async def search_import_rows(
    import_id: int,
    query: str = Query(..., description="Search query text"),
    columns: Optional[List[str]] = Query(None, description="Columns to search in (all if not specified)"),
    page: int = Query(1, ge=1, description="Page number (1-indexed)"),
    page_size: int = Query(100, ge=1, le=1000, description="Number of rows per page"),
    db: Session = Depends(get_db),
):
    """
    Search rows in a CSV import.

    Args:
        import_id: Import session ID
        query: Search query text
        columns: Optional list of column names to search in
        page: Page number (1-indexed)
        page_size: Number of rows per page (max 1000)
        db: Database session

    Returns:
        CsvRowsResponse with matching rows
    """
    try:
        rows, total_count = search_csv_rows(db, import_id, query, columns, page, page_size)
        total_pages = (total_count + page_size - 1) // page_size

        return CsvRowsResponse(
            rows=rows,
            total_count=total_count,
            page=page,
            page_size=page_size,
            total_pages=total_pages,
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy"}
