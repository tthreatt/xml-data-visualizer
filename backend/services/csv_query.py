"""
Service for querying and filtering CSV data from the database.
"""

import logging
import json
from typing import List, Dict, Optional, Tuple
from sqlalchemy import func, or_, and_
from sqlalchemy.orm import Session
from models.db_models import CsvRow, CsvImport

logger = logging.getLogger(__name__)


def query_csv_rows(
    db: Session,
    import_id: int,
    page: int = 1,
    page_size: int = 100,
    filters: Optional[Dict[str, any]] = None,
) -> Tuple[List[Dict[str, str]], int]:
    """
    Query CSV rows with pagination and optional filters.
    
    Args:
        db: Database session
        import_id: Import ID to query
        page: Page number (1-indexed)
        page_size: Number of rows per page
        filters: Optional filter dictionary {column_name: value}
        
    Returns:
        Tuple of (list of row data dictionaries, total count)
    """
    # Base query
    query = db.query(CsvRow).filter(CsvRow.import_id == import_id)
    
    # Apply filters if provided
    if filters:
        for column, value in filters.items():
            if value:
                # Use JSON1 extension to filter on JSON column
                # SQLite JSON1: json_extract(row_data, '$.column_name')
                query = query.filter(
                    func.json_extract(CsvRow.row_data, f'$.{column}').like(f'%{value}%')
                )
    
    # Get total count
    total_count = query.count()
    
    # Apply pagination
    offset = (page - 1) * page_size
    rows = query.order_by(CsvRow.row_index).offset(offset).limit(page_size).all()
    
    # Convert to list of dictionaries
    # Handle case where row_data might be a string (JSON) instead of dict
    row_data_list = []
    for row in rows:
        row_data = row.row_data
        # Log first row for debugging
        if len(row_data_list) == 0:
            logger.info(f"Retrieved first row from DB: type={type(row_data)}, is_dict={isinstance(row_data, dict)}, is_str={isinstance(row_data, str)}, row_index={row.row_index}")
            if isinstance(row_data, dict):
                logger.info(f"First row dict keys (first 5): {list(row_data.keys())[:5]}, sample values: {dict(list(row_data.items())[:3])}")
            elif isinstance(row_data, str):
                logger.info(f"First row string length: {len(row_data)}, first 100 chars: {row_data[:100]}")
        
        # If row_data is a string, parse it as JSON
        if isinstance(row_data, str):
            try:
                row_data = json.loads(row_data)
                logger.warning(f"Row data was string, parsed as JSON: row_index={row.row_index}")
            except json.JSONDecodeError as e:
                logger.error(f"Failed to parse row_data as JSON for row_index={row.row_index}: {e}")
                row_data = {}
        # Ensure it's a dict
        elif not isinstance(row_data, dict):
            logger.error(f"Row data is not dict or string: type={type(row_data)}, row_index={row.row_index}, value_sample={str(row_data)[:100]}")
            row_data = {}
        
        row_data_list.append(row_data)
    
    if row_data_list:
        first_row = row_data_list[0]
        logger.info(f"Returning rows: count={len(row_data_list)}, first_row_type={type(first_row)}, first_row_keys={list(first_row.keys())[:5] if isinstance(first_row, dict) else 'N/A'}, first_row_sample={dict(list(first_row.items())[:3]) if isinstance(first_row, dict) else 'N/A'}")
    else:
        logger.warning(f"No rows returned for import_id={import_id}, page={page}, page_size={page_size}")
    
    return row_data_list, total_count


def search_csv_rows(
    db: Session,
    import_id: int,
    query_text: str,
    columns: Optional[List[str]] = None,
    page: int = 1,
    page_size: int = 100,
) -> Tuple[List[Dict[str, str]], int]:
    """
    Search CSV rows by text across specified columns or all columns.
    
    Args:
        db: Database session
        import_id: Import ID to search
        query_text: Search query text
        columns: Optional list of column names to search in (searches all if None)
        page: Page number (1-indexed)
        page_size: Number of rows per page
        
    Returns:
        Tuple of (list of matching row data dictionaries, total count)
    """
    # Get import to access headers
    csv_import = db.query(CsvImport).filter(CsvImport.id == import_id).first()
    if not csv_import:
        raise ValueError(f"Import with ID {import_id} not found")
    
    # Base query
    base_query = db.query(CsvRow).filter(CsvRow.import_id == import_id)
    
    # Determine which columns to search
    search_columns = columns if columns else csv_import.headers
    
    # Build search conditions using JSON1 extension
    # Search for query_text in any of the specified columns
    search_conditions = []
    for column in search_columns:
        # Use json_extract to get column value and check if it contains query_text
        search_conditions.append(
            func.json_extract(CsvRow.row_data, f'$.{column}').like(f'%{query_text}%')
        )
    
    if search_conditions:
        # Combine conditions with OR (match if found in any column)
        query = base_query.filter(or_(*search_conditions))
    else:
        query = base_query
    
    # Get total count
    total_count = query.count()
    
    # Apply pagination
    offset = (page - 1) * page_size
    rows = query.order_by(CsvRow.row_index).offset(offset).limit(page_size).all()
    
    # Convert to list of dictionaries
    # Handle case where row_data might be a string (JSON) instead of dict
    row_data_list = []
    for row in rows:
        row_data = row.row_data
        
        # If row_data is a string, parse it as JSON
        if isinstance(row_data, str):
            try:
                row_data = json.loads(row_data)
            except json.JSONDecodeError:
                logger.error(f"Failed to parse row_data as JSON for row_index={row.row_index}")
                row_data = {}
        # Ensure it's a dict
        elif not isinstance(row_data, dict):
            logger.error(f"Row data is not dict or string: type={type(row_data)}, row_index={row.row_index}")
            row_data = {}
        
        row_data_list.append(row_data)
    
    return row_data_list, total_count


def get_row_count(db: Session, import_id: int, filters: Optional[Dict[str, any]] = None) -> int:
    """
    Get total row count for an import, optionally filtered.
    
    Args:
        db: Database session
        import_id: Import ID
        filters: Optional filter dictionary
        
    Returns:
        Total row count
    """
    query = db.query(CsvRow).filter(CsvRow.import_id == import_id)
    
    if filters:
        for column, value in filters.items():
            if value:
                query = query.filter(
                    func.json_extract(CsvRow.row_data, f'$.{column}').like(f'%{value}%')
                )
    
    return query.count()
