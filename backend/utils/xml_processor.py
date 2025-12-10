"""
XML processing utilities for the backend.
"""

import xml.etree.ElementTree as ET
from typing import Dict, List, Any, Optional, Tuple
from models.xml_models import XmlNode, XmlFlattenedRecord


def parse_xml_string(xml_content: str) -> ET.Element:
    """
    Parse XML string and return root element.

    Args:
        xml_content: XML content as string

    Returns:
        Root element of parsed XML

    Raises:
        ET.ParseError: If XML is malformed
    """
    try:
        root = ET.fromstring(xml_content)
        return root
    except ET.ParseError as e:
        raise ET.ParseError(f"Malformed XML: {str(e)}") from e


def xml_element_to_node(element: ET.Element, path: str = "", index: int = 0) -> XmlNode:
    """
    Convert XML element to XmlNode model.

    Args:
        element: XML element to convert
        path: Current path in the tree
        index: Index of element among siblings with same tag

    Returns:
        XmlNode representation
    """
    current_path = f"{path}/{element.tag}" if path else element.tag

    # Generate XPath
    xpath = current_path
    if index > 0:
        xpath = f"{current_path}[{index + 1}]"

    # Extract text (strip whitespace)
    text = element.text.strip() if element.text and element.text.strip() else None

    # Process children
    children: List[XmlNode] = []
    tag_counts: Dict[str, int] = {}

    for child in element:
        tag = child.tag
        tag_counts[tag] = tag_counts.get(tag, 0)
        child_index = tag_counts[tag]
        tag_counts[tag] += 1

        child_node = xml_element_to_node(child, current_path, child_index)
        children.append(child_node)

    return XmlNode(
        tag=element.tag,
        attributes=dict(element.attrib),
        text=text,
        children=children,
        path=current_path,
        xpath=xpath,
    )


def flatten_xml_node(node: XmlNode, result: Optional[List[XmlFlattenedRecord]] = None) -> List[XmlFlattenedRecord]:
    """
    Flatten XML node structure into list of records.

    Args:
        node: XmlNode to flatten
        result: Accumulator list (internal use)

    Returns:
        List of flattened records
    """
    if result is None:
        result = []

    record = XmlFlattenedRecord(
        path=node.path,
        tag=node.tag,
        attributes=node.attributes,
        text=node.text,
    )
    result.append(record)

    for child in node.children:
        flatten_xml_node(child, result)

    return result


def calculate_tree_stats(node: XmlNode) -> Tuple[int, int]:
    """
    Calculate total nodes and max depth of XML tree.

    Args:
        node: Root XmlNode

    Returns:
        Tuple of (total_nodes, max_depth)
    """
    total_nodes = 1
    max_depth = 1

    if node.children:
        for child in node.children:
            child_total, child_depth = calculate_tree_stats(child)
            total_nodes += child_total
            max_depth = max(max_depth, child_depth + 1)

    return total_nodes, max_depth


def search_xml_node(
    node: XmlNode, query: str, search_in: List[str] = None
) -> List[XmlNode]:
    """
    Search for nodes matching query.

    Args:
        node: Root XmlNode to search
        query: Search query (case-insensitive)
        search_in: Fields to search in: tag, attribute, text

    Returns:
        List of matching XmlNodes
    """
    if search_in is None:
        search_in = ["tag", "attribute", "text"]

    query_lower = query.lower()
    matches: List[XmlNode] = []

    # Check current node
    match_found = False

    if "tag" in search_in and query_lower in node.tag.lower():
        match_found = True
    if "attribute" in search_in and not match_found:
        for attr_value in node.attributes.values():
            if query_lower in attr_value.lower():
                match_found = True
                break
    if "text" in search_in and node.text and not match_found:
        if query_lower in node.text.lower():
            match_found = True

    if match_found:
        matches.append(node)

    # Search children
    for child in node.children:
        matches.extend(search_xml_node(child, query, search_in))

    return matches


def validate_xml_size(xml_content: str, max_size_mb: int = 50) -> bool:
    """
    Validate XML content size.

    Args:
        xml_content: XML content as string
        max_size_mb: Maximum size in MB

    Returns:
        True if size is valid

    Raises:
        ValueError: If XML exceeds size limit
    """
    size_bytes = len(xml_content.encode("utf-8"))
    size_mb = size_bytes / (1024 * 1024)

    if size_mb > max_size_mb:
        raise ValueError(
            f"XML file size ({size_mb:.2f}MB) exceeds maximum allowed size ({max_size_mb}MB)"
        )

    return True

