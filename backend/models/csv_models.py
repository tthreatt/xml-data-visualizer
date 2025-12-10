"""
Data models for CSV structure representation.
"""

from typing import Dict, List, Optional, Any
from pydantic import BaseModel, Field


class CsvRow(BaseModel):
    """Model for a single CSV row with dynamic columns."""

    data: Dict[str, str] = Field(default_factory=dict, description="Row data as key-value pairs")

    class Config:
        """Pydantic config."""

        json_schema_extra = {
            "example": {
                "data": {
                    "practitionerProfileDetail_practitionerStatus_name": "Active",
                    "practitionerInformation_firstName": "John",
                    "practitionerInformation_lastName": "Doe",
                }
            }
        }


class CsvData(BaseModel):
    """Model for combined CSV data with headers and rows."""

    headers: List[str] = Field(default_factory=list, description="All unique headers from combined files")
    rows: List[CsvRow] = Field(default_factory=list, description="All rows from combined files")
    total_rows: int = Field(default=0, description="Total number of rows")
    total_columns: int = Field(default=0, description="Total number of columns")

    class Config:
        """Pydantic config."""

        json_schema_extra = {
            "example": {
                "headers": ["col1", "col2", "col3"],
                "rows": [{"data": {"col1": "value1", "col2": "value2"}}],
                "total_rows": 1,
                "total_columns": 3,
            }
        }


class CsvNode(BaseModel):
    """Model for hierarchical CSV node representation (similar to XmlNode)."""

    name: str
    path: str
    value: Optional[str] = None
    children: List["CsvNode"] = Field(default_factory=list)
    attributes: Dict[str, str] = Field(default_factory=dict)

    class Config:
        """Pydantic config."""

        json_schema_extra = {
            "example": {
                "name": "practitionerProfileDetail",
                "path": "/practitionerProfileDetail",
                "value": None,
                "children": [
                    {
                        "name": "practitionerStatus",
                        "path": "/practitionerProfileDetail/practitionerStatus",
                        "value": None,
                        "children": [
                            {
                                "name": "name",
                                "path": "/practitionerProfileDetail/practitionerStatus/name",
                                "value": "Active",
                                "children": [],
                                "attributes": {},
                            }
                        ],
                        "attributes": {},
                    }
                ],
                "attributes": {},
            }
        }


class CsvParseResponse(BaseModel):
    """Response model for CSV parsing."""

    data: CsvData
    root: CsvNode
    total_rows: int
    total_columns: int

    class Config:
        """Pydantic config."""

        json_schema_extra = {
            "example": {
                "data": {
                    "headers": ["col1", "col2"],
                    "rows": [{"data": {"col1": "value1"}}],
                    "total_rows": 1,
                    "total_columns": 2,
                },
                "root": {
                    "name": "root",
                    "path": "/root",
                    "value": None,
                    "children": [],
                    "attributes": {},
                },
                "total_rows": 1,
                "total_columns": 2,
            }
        }


class CsvSearchRequest(BaseModel):
    """Request model for CSV search."""

    query: str = Field(..., description="Search query")
    search_in: List[str] = Field(
        default=["header", "value"],
        description="Fields to search in: header, value",
    )

    class Config:
        """Pydantic config."""

        json_schema_extra = {
            "example": {
                "query": "practitioner",
                "search_in": ["header", "value"],
            }
        }


class CsvImportResponse(BaseModel):
    """Response model for CSV import creation."""

    import_id: int = Field(..., description="ID of the import session")
    total_rows: int = Field(..., description="Total number of rows imported")
    total_columns: int = Field(..., description="Total number of columns")
    headers: List[str] = Field(..., description="List of column headers")
    status: str = Field(..., description="Import status: processing, completed, error")

    class Config:
        """Pydantic config."""

        json_schema_extra = {
            "example": {
                "import_id": 1,
                "total_rows": 1000,
                "total_columns": 50,
                "headers": ["col1", "col2", "col3"],
                "status": "completed",
            }
        }


class CsvRowsResponse(BaseModel):
    """Response model for paginated CSV rows."""

    rows: List[Dict[str, str]] = Field(..., description="List of row data dictionaries")
    total_count: int = Field(..., description="Total number of rows matching query")
    page: int = Field(..., description="Current page number")
    page_size: int = Field(..., description="Number of rows per page")
    total_pages: int = Field(..., description="Total number of pages")

    class Config:
        """Pydantic config."""

        json_schema_extra = {
            "example": {
                "rows": [{"col1": "value1", "col2": "value2"}],
                "total_count": 1000,
                "page": 1,
                "page_size": 100,
                "total_pages": 10,
            }
        }
