"""
Data models for XML structure representation.
"""

from typing import Dict, List, Optional, Any
from pydantic import BaseModel, Field


class XmlAttribute(BaseModel):
    """Model for XML attribute."""

    name: str
    value: str


class XmlNode(BaseModel):
    """Model for XML node representation."""

    tag: str
    attributes: Dict[str, str] = Field(default_factory=dict)
    text: Optional[str] = None
    children: List["XmlNode"] = Field(default_factory=list)
    path: str = ""
    xpath: str = ""

    class Config:
        """Pydantic config."""

        json_schema_extra = {
            "example": {
                "tag": "book",
                "attributes": {"id": "1", "isbn": "123456"},
                "text": "Sample Book Title",
                "children": [],
                "path": "/root/book",
                "xpath": "/root/book[1]",
            }
        }


class XmlFlattenedRecord(BaseModel):
    """Model for flattened XML record."""

    path: str
    tag: str
    attributes: Dict[str, str] = Field(default_factory=dict)
    text: Optional[str] = None

    class Config:
        """Pydantic config."""

        json_schema_extra = {
            "example": {
                "path": "/root/book/title",
                "tag": "title",
                "attributes": {},
                "text": "Sample Title",
            }
        }


class XmlParseResponse(BaseModel):
    """Response model for XML parsing."""

    root: XmlNode
    total_nodes: int
    max_depth: int

    class Config:
        """Pydantic config."""

        json_schema_extra = {
            "example": {
                "root": {
                    "tag": "root",
                    "attributes": {},
                    "text": None,
                    "children": [],
                    "path": "/root",
                    "xpath": "/root",
                },
                "total_nodes": 10,
                "max_depth": 3,
            }
        }


class XmlSearchRequest(BaseModel):
    """Request model for XML search."""

    query: str = Field(..., description="Search query (tag, attribute, or value)")
    search_in: List[str] = Field(
        default=["tag", "attribute", "text"],
        description="Fields to search in: tag, attribute, text",
    )

    class Config:
        """Pydantic config."""

        json_schema_extra = {
            "example": {
                "query": "book",
                "search_in": ["tag", "attribute", "text"],
            }
        }


class XmlExportRequest(BaseModel):
    """Request model for XML export."""

    format: str = Field(..., description="Export format: csv or json")
    filters: Optional[Dict[str, Any]] = Field(
        default=None, description="Optional filters to apply"
    )

    class Config:
        """Pydantic config."""

        json_schema_extra = {
            "example": {
                "format": "csv",
                "filters": {"tag": "book"},
            }
        }

