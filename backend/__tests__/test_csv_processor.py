"""
Tests for CSV processor utilities.
"""

import pytest
import csv
import io
from utils.csv_processor import (
    parse_csv_content,
    combine_csv_files,
    parse_header_hierarchy,
    csv_to_hierarchical,
    flatten_csv_node,
    search_csv_data,
    validate_csv_size,
    calculate_csv_stats,
)
from models.csv_models import CsvData, CsvRow, CsvNode


def test_parse_csv_content():
    """Test parsing CSV content string."""
    csv_content = "col1,col2,col3\nvalue1,value2,value3\nvalue4,value5,value6"
    headers, rows = parse_csv_content(csv_content)

    assert headers == ["col1", "col2", "col3"]
    assert len(rows) == 2
    assert rows[0] == {"col1": "value1", "col2": "value2", "col3": "value3"}
    assert rows[1] == {"col1": "value4", "col2": "value5", "col3": "value6"}


def test_parse_csv_content_empty():
    """Test parsing empty CSV content."""
    csv_content = "col1,col2\n"
    headers, rows = parse_csv_content(csv_content)

    assert headers == ["col1", "col2"]
    assert len(rows) == 0


def test_combine_csv_files_single():
    """Test combining a single CSV file."""
    csv_content = "col1,col2\nvalue1,value2\nvalue3,value4"
    result = combine_csv_files([csv_content])

    assert len(result.headers) == 2
    assert result.headers == ["col1", "col2"]
    assert result.total_rows == 2
    assert result.total_columns == 2
    assert len(result.rows) == 2


def test_combine_csv_files_multiple():
    """Test combining multiple CSV files with union of headers."""
    csv1 = "col1,col2\nvalue1,value2"
    csv2 = "col2,col3\nvalue3,value4"
    result = combine_csv_files([csv1, csv2])

    assert len(result.headers) == 3
    assert set(result.headers) == {"col1", "col2", "col3"}
    assert result.total_rows == 2
    assert result.total_columns == 3

    # Check first row has all columns
    assert "col1" in result.rows[0].data
    assert "col2" in result.rows[0].data
    assert "col3" in result.rows[0].data
    assert result.rows[0].data["col3"] == ""  # Missing column filled with empty string


def test_combine_csv_files_missing_columns():
    """Test combining CSV files where some files have missing columns."""
    csv1 = "col1,col2,col3\nval1,val2,val3"
    csv2 = "col1,col2\nval4,val5"
    result = combine_csv_files([csv1, csv2])

    assert len(result.headers) == 3
    assert result.total_rows == 2
    # Second row should have empty col3
    assert result.rows[1].data["col3"] == ""


def test_parse_header_hierarchy():
    """Test parsing header hierarchy from underscore-separated headers."""
    header = "practitionerProfileDetail_practitionerStatus_name"
    parts = parse_header_hierarchy(header)

    assert parts == ["practitionerProfileDetail", "practitionerStatus", "name"]


def test_parse_header_hierarchy_simple():
    """Test parsing simple header without underscores."""
    header = "simpleHeader"
    parts = parse_header_hierarchy(header)

    assert parts == ["simpleHeader"]


def test_csv_to_hierarchical():
    """Test converting CSV data to hierarchical structure."""
    csv_data = CsvData(
        headers=["level1_level2_value", "level1_other"],
        rows=[
            CsvRow(data={"level1_level2_value": "test1", "level1_other": "test2"}),
        ],
    )

    root = csv_to_hierarchical(csv_data)

    assert root.name == "root"
    assert root.path == "/root"
    assert len(root.children) == 1
    assert root.children[0].name == "level1"
    assert len(root.children[0].children) == 2


def test_csv_to_hierarchical_complex():
    """Test converting complex CSV with multiple hierarchy levels."""
    csv_data = CsvData(
        headers=[
            "practitionerProfileDetail_practitionerStatus_name",
            "practitionerInformation_firstName",
            "practitionerInformation_lastName",
        ],
        rows=[
            CsvRow(
                data={
                    "practitionerProfileDetail_practitionerStatus_name": "Active",
                    "practitionerInformation_firstName": "John",
                    "practitionerInformation_lastName": "Doe",
                }
            ),
        ],
    )

    root = csv_to_hierarchical(csv_data)

    assert root.name == "root"
    # Should have two top-level children: practitionerProfileDetail and practitionerInformation
    top_level_names = [child.name for child in root.children]
    assert "practitionerProfileDetail" in top_level_names
    assert "practitionerInformation" in top_level_names


def test_flatten_csv_node():
    """Test flattening CSV node structure."""
    node = CsvNode(
        name="root",
        path="/root",
        value=None,
        children=[
            CsvNode(
                name="child1",
                path="/root/child1",
                value="value1",
                children=[],
                attributes={},
            ),
            CsvNode(
                name="child2",
                path="/root/child2",
                value=None,
                children=[
                    CsvNode(
                        name="grandchild",
                        path="/root/child2/grandchild",
                        value="value2",
                        children=[],
                        attributes={},
                    ),
                ],
                attributes={},
            ),
        ],
        attributes={},
    )

    flattened = flatten_csv_node(node)

    assert len(flattened) == 4  # root, child1, child2, grandchild
    assert flattened[0]["name"] == "root"
    assert flattened[1]["name"] == "child1"
    assert flattened[1]["value"] == "value1"
    assert flattened[2]["name"] == "child2"
    assert flattened[3]["name"] == "grandchild"


def test_search_csv_data_by_header():
    """Test searching CSV data by header name."""
    csv_data = CsvData(
        headers=["col1", "col2", "test_column"],
        rows=[
            CsvRow(data={"col1": "value1", "col2": "value2", "test_column": "value3"}),
            CsvRow(data={"col1": "value4", "col2": "value5", "test_column": "value6"}),
        ],
    )

    matches = search_csv_data(csv_data, "test", ["header"])

    assert len(matches) == 2  # Both rows match because header contains "test"


def test_search_csv_data_by_value():
    """Test searching CSV data by value."""
    csv_data = CsvData(
        headers=["col1", "col2"],
        rows=[
            CsvRow(data={"col1": "search_term", "col2": "value2"}),
            CsvRow(data={"col1": "value3", "col2": "other"}),
        ],
    )

    matches = search_csv_data(csv_data, "search_term", ["value"])

    assert len(matches) == 1
    assert matches[0]["col1"] == "search_term"


def test_search_csv_data_no_matches():
    """Test searching CSV data with no matches."""
    csv_data = CsvData(
        headers=["col1", "col2"],
        rows=[
            CsvRow(data={"col1": "value1", "col2": "value2"}),
        ],
    )

    matches = search_csv_data(csv_data, "nonexistent", ["value"])

    assert len(matches) == 0


def test_validate_csv_size():
    """Test CSV size validation."""
    small_csv = "col1,col2\nvalue1,value2"
    assert validate_csv_size(small_csv, max_size_mb=100) is True

    # Create a large CSV string (simulate)
    large_csv = "col1\n" + "x" * (101 * 1024 * 1024)
    with pytest.raises(ValueError):
        validate_csv_size(large_csv, max_size_mb=100)


def test_calculate_csv_stats():
    """Test calculating CSV statistics."""
    csv_data = CsvData(
        headers=["col1", "col2", "col3"],
        rows=[
            CsvRow(data={"col1": "v1", "col2": "v2", "col3": "v3"}),
            CsvRow(data={"col1": "v4", "col2": "v5", "col3": "v6"}),
        ],
        total_rows=2,
        total_columns=3,
    )

    total_rows, total_columns = calculate_csv_stats(csv_data)

    assert total_rows == 2
    assert total_columns == 3


def test_combine_csv_files_large_number_of_columns():
    """Test combining CSV files with large number of columns."""
    # Create CSV with many columns (simulating 2,214+ columns)
    num_columns = 100  # Use smaller number for test, but test the logic
    headers = [f"col{i}" for i in range(num_columns)]
    csv_content = ",".join(headers) + "\n" + ",".join(["value"] * num_columns)

    result = combine_csv_files([csv_content])

    assert len(result.headers) == num_columns
    assert result.total_columns == num_columns
    assert result.total_rows == 1


def test_csv_to_hierarchical_with_empty_values():
    """Test converting CSV to hierarchical structure with empty values."""
    csv_data = CsvData(
        headers=["col1", "col2"],
        rows=[
            CsvRow(data={"col1": "value1", "col2": ""}),
            CsvRow(data={"col1": "", "col2": "value2"}),
        ],
    )

    root = csv_to_hierarchical(csv_data)

    # Should still create hierarchy even with empty values
    assert root.name == "root"
    assert len(root.children) > 0
