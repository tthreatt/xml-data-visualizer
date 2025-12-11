from fastapi import APIRouter, HTTPException, Depends, Request
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import List
import csv
import io
from database import get_db
from services.csv_query import query_csv_rows

router = APIRouter(prefix="/api/csv", tags=["csv"])

@router.post("/exports/counts")
async def export_counts_csv(request: Request, db: Session = Depends(get_db)):
    """
    Export field counts for all selected columns in a CSV import as a CSV file.
    Request body: { import_id: int, columns: List[str] }
    Returns: StreamingResponse with CSV file
    """
    body = await request.json()
    import_id = body.get("import_id")
    columns = body.get("columns")
    if not import_id or not columns:
        raise HTTPException(status_code=400, detail="import_id and columns required")

    # Query all rows for the import
    rows, total_count = query_csv_rows(db, import_id, page=1, page_size=1000000, columns=columns)

    # Calculate counts for each column
    def generate_csv():
        output = io.StringIO()
        writer = csv.writer(output)
        for field in columns:
            value_counts = {}
            for row in rows:
                value = row.get(field, "")
                display_value = "(empty)" if value == "" else str(value)
                value_counts[display_value] = value_counts.get(display_value, 0) + 1
            # Write field header
            writer.writerow([field, "Value", "Count"])
            for value, count in sorted(value_counts.items(), key=lambda x: (-x[1], x[0])):
                writer.writerow(["", value, count])
            writer.writerow([])  # Blank line between fields
        yield output.getvalue()
    return StreamingResponse(generate_csv(), media_type="text/csv", headers={"Content-Disposition": f"attachment; filename=field_counts_{import_id}.csv"})
