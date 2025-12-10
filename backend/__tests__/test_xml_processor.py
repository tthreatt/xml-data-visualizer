"""
Tests for XML processor utilities.
"""

import pytest
import xml.etree.ElementTree as ET
from utils.xml_processor import (
    parse_xml_string,
    xml_element_to_node,
    flatten_xml_node,
    calculate_tree_stats,
    search_xml_node,
    validate_xml_size,
)
from models.xml_models import XmlNode


def test_parse_xml_string_valid():
    """Test parsing valid XML string."""
    xml_content = '<?xml version="1.0"?><root><child>text</child></root>'
    root = parse_xml_string(xml_content)
    assert root.tag == "root"
    assert len(list(root)) == 1


def test_parse_xml_string_invalid():
    """Test parsing invalid XML string raises error."""
    xml_content = "<root><unclosed>"
    with pytest.raises(ET.ParseError):
        parse_xml_string(xml_content)


def test_xml_element_to_node():
    """Test converting XML element to node."""
    xml_content = '<?xml version="1.0"?><root attr="value"><child>text</child></root>'
    root_element = parse_xml_string(xml_content)
    node = xml_element_to_node(root_element)

    assert node.tag == "root"
    assert node.attributes == {"attr": "value"}
    assert len(node.children) == 1
    assert node.children[0].tag == "child"
    assert node.children[0].text == "text"


def test_calculate_tree_stats():
    """Test calculating tree statistics."""
    xml_content = '<?xml version="1.0"?><root><child1/><child2><grandchild/></child2></root>'
    root_element = parse_xml_string(xml_content)
    root_node = xml_element_to_node(root_element)

    total_nodes, max_depth = calculate_tree_stats(root_node)

    assert total_nodes == 4  # root, child1, child2, grandchild
    assert max_depth == 3  # root -> child2 -> grandchild


def test_search_xml_node():
    """Test searching XML nodes."""
    xml_content = '<?xml version="1.0"?><root><book id="1">Title</book><author>Name</author></root>'
    root_element = parse_xml_string(xml_content)
    root_node = xml_element_to_node(root_element)

    # Search by tag
    matches = search_xml_node(root_node, "book", ["tag"])
    assert len(matches) == 1
    assert matches[0].tag == "book"

    # Search by text
    matches = search_xml_node(root_node, "Title", ["text"])
    assert len(matches) == 1

    # Search by attribute
    matches = search_xml_node(root_node, "1", ["attribute"])
    assert len(matches) == 1


def test_validate_xml_size():
    """Test XML size validation."""
    small_xml = "<root>test</root>"
    assert validate_xml_size(small_xml, max_size_mb=50) is True

    # Create a large XML string (simulate)
    large_xml = "<root>" + "x" * (51 * 1024 * 1024) + "</root>"
    with pytest.raises(ValueError):
        validate_xml_size(large_xml, max_size_mb=50)


def test_flatten_xml_node():
    """Test flattening XML node structure."""
    xml_content = '<?xml version="1.0"?><root><child1>text1</child1><child2>text2</child2></root>'
    root_element = parse_xml_string(xml_content)
    root_node = xml_element_to_node(root_element)

    flattened = flatten_xml_node(root_node)

    assert len(flattened) == 3  # root, child1, child2
    assert flattened[0].tag == "root"
    assert flattened[1].tag == "child1"
    assert flattened[2].tag == "child2"

