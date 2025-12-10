"""
CSV processing utilities for the backend.
"""

import csv
import io
from typing import Dict, List, Any, Optional, Tuple
from collections import defaultdict
from models.csv_models import CsvRow, CsvData, CsvNode


def parse_csv_content(content: str) -> Tuple[List[str], List[Dict[str, str]]]:
    """
    Parse CSV content string and return headers and rows.

    Args:
        content: CSV content as string

    Returns:
        Tuple of (headers, rows) where rows are dictionaries
    """
    reader = csv.DictReader(io.StringIO(content))
    headers = reader.fieldnames or []
    rows = [dict(row) for row in reader]
    return list(headers), rows


def combine_csv_files(contents: List[str]) -> CsvData:
    """
    Combine multiple CSV files by unioning their headers.
    Preserves header order from the first file, appending new headers from subsequent files.

    Args:
        contents: List of CSV content strings

    Returns:
        CsvData with combined headers and rows
    """
    # Use ordered list to preserve header order
    all_headers: List[str] = []
    all_headers_set: set = set()  # For fast lookup
    all_rows: List[Dict[str, str]] = []

    # First pass: collect all headers, preserving order from first file
    for file_index, content in enumerate(contents):
        headers, _ = parse_csv_content(content)
        if file_index == 0:
            # First file: use its headers as the base order
            all_headers = list(headers)
            all_headers_set = set(headers)
        else:
            # Subsequent files: append new headers in their original order
            for header in headers:
                if header not in all_headers_set:
                    all_headers.append(header)
                    all_headers_set.add(header)

    # Second pass: read all rows with union of headers
    for content in contents:
        headers, rows = parse_csv_content(content)
        for row in rows:
            # Create a new row with all headers, filling missing values with empty strings
            # Use all_headers list to maintain order
            combined_row: Dict[str, str] = {}
            for header in all_headers:
                combined_row[header] = row.get(header, "")
            all_rows.append(combined_row)

    # Convert to CsvRow objects
    csv_rows = [CsvRow(data=row) for row in all_rows]

    return CsvData(
        headers=all_headers,  # Preserve order, don't sort
        rows=csv_rows,
        total_rows=len(csv_rows),
        total_columns=len(all_headers),
    )


def parse_header_hierarchy(header: str) -> List[str]:
    """
    Parse underscore-separated header into hierarchy levels.

    Args:
        header: Header string like "practitionerProfileDetail_practitionerStatus_name"

    Returns:
        List of hierarchy levels: ["practitionerProfileDetail", "practitionerStatus", "name"]
    """
    return header.split("_")


def csv_to_hierarchical(data: CsvData) -> CsvNode:
    """
    Convert flat CSV data to hierarchical tree structure based on header patterns.
    
    NOTE: This function is deprecated for CSV data. CSV rows represent separate records
    (one person per row) and should not be combined. Tree view is not recommended for CSV.
    This function is kept for backward compatibility but returns a minimal tree structure.

    Args:
        data: CsvData with headers and rows

    Returns:
        Root CsvNode with minimal hierarchical structure (no value combination)
    """
    # For CSV data, each row is a separate record and should not be combined
    # Return a minimal tree structure that just shows the header hierarchy
    # without combining values across rows
    root = CsvNode(name="root", path="/root", children=[], attributes={})

    # Build node structure from headers only (no value combination)
    # This creates the tree structure but doesn't populate values
    node_map: Dict[tuple, CsvNode] = {}

    def get_or_create_node(parts: tuple, parent_path: str = "/root") -> CsvNode:
        """Get or create a node for the given path parts (structure only, no values)."""
        if parts in node_map:
            return node_map[parts]

        if len(parts) == 0:
            return root

        # Build path
        current_path = f"{parent_path}/{parts[-1]}" if parent_path != "/root" else f"/{parts[-1]}"

        # Create node without combining values - each CSV row is separate
        node = CsvNode(
            name=parts[-1],
            path=current_path,
            value=None,  # No value combination - CSV rows are separate records
            children=[],
            attributes={},
        )

        node_map[parts] = node
        return node

    # Build tree structure from headers only
    for header in data.headers:
        parts = parse_header_hierarchy(header)

        # Create all parent nodes
        for i in range(1, len(parts) + 1):
            parent_parts = tuple(parts[:i-1]) if i > 1 else tuple()
            current_parts = tuple(parts[:i])

            parent_node = get_or_create_node(parent_parts) if parent_parts else root
            current_node = get_or_create_node(current_parts, parent_node.path)

            # Add to parent if not already added
            if current_node not in parent_node.children:
                parent_node.children.append(current_node)

    return root


def flatten_csv_node(node: CsvNode, result: Optional[List[Dict[str, Any]]] = None) -> List[Dict[str, Any]]:
    """
    Flatten CSV node structure into list of records.

    Args:
        node: CsvNode to flatten
        result: Accumulator list (internal use)

    Returns:
        List of flattened records
    """
    if result is None:
        result = []

    record: Dict[str, Any] = {
        "path": node.path,
        "name": node.name,
        "value": node.value,
        "attributes": node.attributes,
    }
    result.append(record)

    for child in node.children:
        flatten_csv_node(child, result)

    return result


def search_csv_data(
    data: CsvData, query: str, search_in: List[str] = None
) -> List[Dict[str, Any]]:
    """
    Search CSV data for matching rows.

    Args:
        data: CsvData to search
        query: Search query (case-insensitive)
        search_in: Fields to search in: header, value

    Returns:
        List of matching rows as dictionaries
    """
    if search_in is None:
        search_in = ["header", "value"]

    query_lower = query.lower()
    matches: List[Dict[str, Any]] = []

    for row in data.rows:
        match_found = False

        if "header" in search_in:
            # Search in header names
            for header in data.headers:
                if query_lower in header.lower():
                    match_found = True
                    break

        if "value" in search_in and not match_found:
            # Search in row values
            for value in row.data.values():
                if value and query_lower in str(value).lower():
                    match_found = True
                    break

        if match_found:
            matches.append(row.data)

    return matches


def validate_csv_size(content: str, max_size_mb: int = 100) -> bool:
    """
    Validate CSV content size.

    Args:
        content: CSV content as string
        max_size_mb: Maximum size in MB

    Returns:
        True if size is valid

    Raises:
        ValueError: If CSV exceeds size limit
    """
    size_bytes = len(content.encode("utf-8"))
    size_mb = size_bytes / (1024 * 1024)

    if size_mb > max_size_mb:
        raise ValueError(
            f"CSV file size ({size_mb:.2f}MB) exceeds maximum allowed size ({max_size_mb}MB)"
        )

    return True


def calculate_csv_stats(data: CsvData) -> Tuple[int, int]:
    """
    Calculate total rows and columns of CSV data.

    Args:
        data: CsvData

    Returns:
        Tuple of (total_rows, total_columns)
    """
    return data.total_rows, data.total_columns
