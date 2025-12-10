"""
Service for storing CSV data in the database.
"""

import logging
import json
from typing import List
from sqlalchemy.orm import Session
from datetime import datetime
from models.db_models import CsvImport, CsvRow, CsvMetadata
from models.csv_models import CsvData

logger = logging.getLogger(__name__)


BATCH_SIZE = 1000  # Insert rows in batches of 1000


def store_csv_import(db: Session, combined_data: CsvData, file_names: List[str]) -> int:
    """
    Store combined CSV data in the database.
    
    Args:
        db: Database session
        combined_data: Combined CSV data to store
        file_names: List of source file names
        
    Returns:
        import_id: The ID of the created import record
    """
    try:
        # Create import record
        csv_import = CsvImport(
            created_at=datetime.utcnow(),
            total_rows=combined_data.total_rows,
            total_columns=combined_data.total_columns,
            headers=combined_data.headers,
            status="processing",
        )
        db.add(csv_import)
        db.flush()  # Get the ID without committing
        
        # Create metadata record
        metadata = CsvMetadata(
            import_id=csv_import.id,
            file_names=file_names,
            combined_at=datetime.utcnow(),
        )
        db.add(metadata)
        
        # Insert rows in batches for performance
        # NOTE: Using db.add() instead of bulk_save_objects to ensure proper JSON serialization
        # bulk_save_objects can bypass SQLAlchemy's type coercion for JSON columns
        rows_to_insert = []
        for row_index, csv_row in enumerate(combined_data.rows):
            # Log first row for debugging
            if row_index == 0:
                logger.info(f"Storing first row: type={type(csv_row.data)}, keys={list(csv_row.data.keys())[:5] if csv_row.data else []}, sample_values={list(csv_row.data.values())[:3] if csv_row.data else []}")
            
            # Ensure row_data is a dict (not None or other type)
            row_data = csv_row.data if csv_row.data else {}
            if not isinstance(row_data, dict):
                logger.warning(f"Row data is not a dict, converting: type={type(row_data)}, row_index={row_index}")
                row_data = {}
            
            # Create CsvRow object - using db.add() ensures proper JSON serialization
            db_row = CsvRow(
                import_id=csv_import.id,
                row_data=row_data,  # SQLAlchemy JSON column will serialize this properly
                row_index=row_index,
            )
            db.add(db_row)
            rows_to_insert.append(db_row)
            
            # Flush in batches for performance
            if len(rows_to_insert) >= BATCH_SIZE:
                db.flush()
                rows_to_insert = []
        
        # Flush remaining rows
        if rows_to_insert:
            db.flush()
        
        # Verify first row was stored correctly
        if combined_data.rows:
            first_stored = db.query(CsvRow).filter(
                CsvRow.import_id == csv_import.id,
                CsvRow.row_index == 0
            ).first()
            if first_stored:
                logger.info(f"Verified stored row: type={type(first_stored.row_data)}, is_dict={isinstance(first_stored.row_data, dict)}, is_str={isinstance(first_stored.row_data, str)}, keys={list(first_stored.row_data.keys())[:5] if isinstance(first_stored.row_data, dict) else 'N/A'}")
                if isinstance(first_stored.row_data, str):
                    logger.warning(f"WARNING: Stored row_data is a string, not a dict! This indicates JSON serialization issue.")
                elif not isinstance(first_stored.row_data, dict):
                    logger.error(f"ERROR: Stored row_data is neither dict nor string: {type(first_stored.row_data)}")
        
        # Update status to completed
        csv_import.status = "completed"
        db.commit()
        
        return csv_import.id
        
    except Exception as e:
        db.rollback()
        # Update status to error if import record exists
        if 'csv_import' in locals() and csv_import.id:
            csv_import.status = "error"
            csv_import.error_message = str(e)
            db.commit()
        raise


def get_csv_import(db: Session, import_id: int) -> CsvImport:
    """
    Get CSV import metadata by ID.
    
    Args:
        db: Database session
        import_id: Import ID
        
    Returns:
        CsvImport record
    """
    csv_import = db.query(CsvImport).filter(CsvImport.id == import_id).first()
    if not csv_import:
        raise ValueError(f"Import with ID {import_id} not found")
    return csv_import
