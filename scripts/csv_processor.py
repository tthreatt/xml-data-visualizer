#!/usr/bin/env python3
"""
Standalone CSV processing utility script.

This script can be used for testing CSV parsing, combining CSV files
from the command line, or as a reference implementation for CSV handling.
"""

import sys
import csv
import json
from pathlib import Path
from typing import Dict, List, Any, Optional, Set
from collections import defaultdict


def read_csv_file(file_path: str) -> tuple[List[str], List[Dict[str, str]]]:
    """
    Read a CSV file and return headers and rows.

    Args:
        file_path: Path to the CSV file

    Returns:
        Tuple of (headers, rows) where rows are dictionaries

    Raises:
        FileNotFoundError: If the file doesn't exist
    """
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            headers = list(reader.fieldnames or [])
            rows = [dict(row) for row in reader]
            return headers, rows
    except FileNotFoundError:
        raise FileNotFoundError(f"File not found: {file_path}")
    except Exception as e:
        raise Exception(f"Error reading CSV file: {e}") from e


def combine_csv_files(file_paths: List[str]) -> tuple[List[str], List[Dict[str, str]]]:
    """
    Combine multiple CSV files by unioning their headers.

    Args:
        file_paths: List of paths to CSV files

    Returns:
        Tuple of (combined_headers, combined_rows)
    """
    all_headers: Set[str] = set()
    all_rows: List[Dict[str, str]] = []

    # First pass: collect all headers
    for file_path in file_paths:
        headers, _ = read_csv_file(file_path)
        all_headers.update(headers)

    # Second pass: read all rows with union of headers
    for file_path in file_paths:
        headers, rows = read_csv_file(file_path)
        for row in rows:
            # Create a new row with all headers, filling missing values with empty strings
            combined_row: Dict[str, str] = {}
            for header in sorted(all_headers):
                combined_row[header] = row.get(header, "")
            all_rows.append(combined_row)

    return sorted(list(all_headers)), all_rows


def parse_header_hierarchy(header: str) -> List[str]:
    """
    Parse underscore-separated header into hierarchy levels.

    Args:
        header: Header string like "practitionerProfileDetail_practitionerStatus_name"

    Returns:
        List of hierarchy levels
    """
    return header.split("_")


def csv_to_hierarchical(headers: List[str], rows: List[Dict[str, str]]) -> Dict[str, Any]:
    """
    Convert flat CSV data to hierarchical structure based on header patterns.

    Args:
        headers: List of CSV headers
        rows: List of CSV rows as dictionaries

    Returns:
        Hierarchical dictionary structure
    """
    # Build hierarchy from headers
    header_tree: Dict[str, Any] = {}

    for header in headers:
        parts = parse_header_hierarchy(header)
        current = header_tree

        # Build nested structure
        for part in parts:
            if part not in current:
                current[part] = {}
            current = current[part]

    # Convert to hierarchical structure with values
    def build_hierarchy(node_dict: Dict[str, Any], parent_path: str = "") -> Dict[str, Any]:
        result: Dict[str, Any] = {}
        for name, children_dict in node_dict.items():
            current_path = f"{parent_path}/{name}" if parent_path else name
            node: Dict[str, Any] = {
                "name": name,
                "path": current_path,
                "value": None,
                "children": [],
            }

            if children_dict:
                # Has children, recurse
                for child_name, child_dict in children_dict.items():
                    child = build_hierarchy({child_name: child_dict}, current_path)
                    node["children"].append(child[child_name])
            else:
                # Leaf node, collect values from rows
                values = []
                for row in rows:
                    # Find the full header that ends with this name
                    for header in headers:
                        if header.endswith(f"_{name}") or header == name:
                            value = row.get(header, "")
                            if value:
                                values.append(value)
                if values:
                    node["value"] = ", ".join(set(values)) if len(set(values)) > 1 else values[0]

            result[name] = node
        return result

    return build_hierarchy(header_tree)


def write_csv_file(headers: List[str], rows: List[Dict[str, str]], output_path: str):
    """
    Write CSV data to a file.

    Args:
        headers: List of column headers
        rows: List of row dictionaries
        output_path: Path to output file
    """
    with open(output_path, 'w', encoding='utf-8', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=headers)
        writer.writeheader()
        writer.writerows(rows)


def main():
    """Main entry point for the script."""
    if len(sys.argv) < 2:
        print("Usage: python csv_processor.py <csv_file1> [csv_file2 ...] [--output=output.csv] [--format=json|csv|hierarchical]")
        sys.exit(1)

    file_paths = []
    output_path = None
    output_format = "csv"

    # Parse arguments
    for arg in sys.argv[1:]:
        if arg.startswith("--output="):
            output_path = arg.split("=", 1)[1]
        elif arg.startswith("--format="):
            output_format = arg.split("=", 1)[1]
        elif not arg.startswith("--"):
            file_paths.append(arg)

    if not file_paths:
        print("Error: At least one CSV file is required")
        sys.exit(1)

    try:
        if len(file_paths) == 1:
            # Single file
            headers, rows = read_csv_file(file_paths[0])
            print(f"Read {len(rows)} rows with {len(headers)} columns from {file_paths[0]}")
        else:
            # Multiple files - combine them
            headers, rows = combine_csv_files(file_paths)
            print(f"Combined {len(file_paths)} files into {len(rows)} rows with {len(headers)} columns")

        if output_format == "json":
            output_data = {
                "headers": headers,
                "rows": rows,
                "total_rows": len(rows),
                "total_columns": len(headers),
            }
            output = json.dumps(output_data, indent=2)
            if output_path:
                with open(output_path, 'w', encoding='utf-8') as f:
                    f.write(output)
            else:
                print(output)
        elif output_format == "hierarchical":
            hierarchical = csv_to_hierarchical(headers, rows)
            output = json.dumps(hierarchical, indent=2)
            if output_path:
                with open(output_path, 'w', encoding='utf-8') as f:
                    f.write(output)
            else:
                print(output)
        else:
            # CSV format
            if output_path:
                write_csv_file(headers, rows, output_path)
                print(f"Written combined CSV to {output_path}")
            else:
                # Print to stdout
                writer = csv.DictWriter(sys.stdout, fieldnames=headers)
                writer.writeheader()
                writer.writerows(rows)

    except Exception as e:
        print(f"Error processing CSV: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
