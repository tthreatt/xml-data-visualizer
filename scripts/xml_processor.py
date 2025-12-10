#!/usr/bin/env python3
"""
Standalone XML processing utility script.

This script can be used for testing XML parsing, processing XML files
from the command line, or as a reference implementation for XML handling.
"""

import sys
import xml.etree.ElementTree as ET
from pathlib import Path
from typing import Dict, List, Any, Optional
import json


def parse_xml_file(file_path: str) -> ET.Element:
    """
    Parse an XML file and return the root element.

    Args:
        file_path: Path to the XML file

    Returns:
        Root element of the parsed XML

    Raises:
        ET.ParseError: If the XML is malformed
        FileNotFoundError: If the file doesn't exist
    """
    try:
        tree = ET.parse(file_path)
        return tree.getroot()
    except ET.ParseError as e:
        raise ET.ParseError(f"Malformed XML: {e}") from e
    except FileNotFoundError:
        raise FileNotFoundError(f"File not found: {file_path}")


def xml_to_dict(element: ET.Element) -> Dict[str, Any]:
    """
    Convert an XML element to a dictionary representation.

    Args:
        element: XML element to convert

    Returns:
        Dictionary representation of the XML element
    """
    result: Dict[str, Any] = {
        "tag": element.tag,
        "attributes": dict(element.attrib),
        "text": element.text.strip() if element.text and element.text.strip() else None,
        "children": [],
    }

    for child in element:
        result["children"].append(xml_to_dict(child))

    # Add tail text if present
    if element.tail and element.tail.strip():
        result["tail"] = element.tail.strip()

    return result


def flatten_xml(element: ET.Element, path: str = "", result: Optional[List[Dict[str, Any]]] = None) -> List[Dict[str, Any]]:
    """
    Flatten XML structure into a list of records.

    Args:
        element: XML element to flatten
        path: Current XPath
        result: Accumulator list (internal use)

    Returns:
        List of flattened XML records
    """
    if result is None:
        result = []

    current_path = f"{path}/{element.tag}" if path else element.tag

    # Create record for current element
    record: Dict[str, Any] = {
        "path": current_path,
        "tag": element.tag,
        "attributes": element.attrib,
        "text": element.text.strip() if element.text and element.text.strip() else None,
    }

    result.append(record)

    # Process children
    for child in element:
        flatten_xml(child, current_path, result)

    return result


def get_xpath(element: ET.Element, root: ET.Element) -> str:
    """
    Generate XPath for an element using recursive traversal.

    Args:
        element: Element to get XPath for
        root: Root element of the XML tree

    Returns:
        XPath string
    """
    if element == root:
        return f"/{element.tag}"

    # Recursively find path from root
    def find_path(current: ET.Element, target: ET.Element, current_path: str) -> Optional[str]:
        if current == target:
            return current_path

        for child in current:
            child_path = f"{current_path}/{child.tag}"
            # Add index if there are multiple siblings with same tag
            siblings = [s for s in current if s.tag == child.tag]
            if len(siblings) > 1:
                child_path = f"{current_path}/{child.tag}[{siblings.index(child) + 1}]"
            
            result = find_path(child, target, child_path)
            if result:
                return result

        return None

    result = find_path(root, element, f"/{root.tag}")
    return result if result else f"/{element.tag}"


def main():
    """Main entry point for the script."""
    if len(sys.argv) < 2:
        print("Usage: python xml_processor.py <xml_file> [--format=json|dict|flatten]")
        sys.exit(1)

    file_path = sys.argv[1]
    output_format = "dict"

    if len(sys.argv) > 2:
        for arg in sys.argv[2:]:
            if arg.startswith("--format="):
                output_format = arg.split("=")[1]

    try:
        root = parse_xml_file(file_path)

        if output_format == "json":
            xml_dict = xml_to_dict(root)
            print(json.dumps(xml_dict, indent=2))
        elif output_format == "flatten":
            flattened = flatten_xml(root)
            print(json.dumps(flattened, indent=2))
        else:
            xml_dict = xml_to_dict(root)
            print(json.dumps(xml_dict, indent=2))

    except Exception as e:
        print(f"Error processing XML: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()

