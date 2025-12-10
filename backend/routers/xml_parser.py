"""
XML parsing API routes.
"""

from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse
from typing import List
import xml.etree.ElementTree as ET

from models.xml_models import (
    XmlParseResponse,
    XmlNode,
    XmlFlattenedRecord,
    XmlSearchRequest,
    XmlExportRequest,
)
from utils.xml_processor import (
    parse_xml_string,
    xml_element_to_node,
    flatten_xml_node,
    calculate_tree_stats,
    search_xml_node,
    validate_xml_size,
)

router = APIRouter(prefix="/api/xml", tags=["xml"])


@router.post("/parse", response_model=XmlParseResponse)
async def parse_xml_file(file: UploadFile = File(...)):
    """
    Parse uploaded XML file and return structured representation.

    Args:
        file: Uploaded XML file

    Returns:
        XmlParseResponse with parsed XML structure
    """
    # Validate file type
    if not file.filename or not file.filename.lower().endswith(".xml"):
        raise HTTPException(status_code=400, detail="File must be an XML file")

    # Read file content
    content = await file.read()
    xml_content = content.decode("utf-8")

    # Validate size (50MB limit)
    try:
        validate_xml_size(xml_content, max_size_mb=50)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    # Parse XML
    try:
        root_element = parse_xml_string(xml_content)
    except ET.ParseError as e:
        raise HTTPException(status_code=400, detail=f"Malformed XML: {str(e)}")

    # Convert to node structure
    root_node = xml_element_to_node(root_element)

    # Calculate stats
    total_nodes, max_depth = calculate_tree_stats(root_node)

    return XmlParseResponse(
        root=root_node,
        total_nodes=total_nodes,
        max_depth=max_depth,
    )


@router.post("/parse-string", response_model=XmlParseResponse)
async def parse_xml_string_endpoint(xml_content: str):
    """
    Parse XML string and return structured representation.

    Args:
        xml_content: XML content as string

    Returns:
        XmlParseResponse with parsed XML structure
    """
    # Validate size
    try:
        validate_xml_size(xml_content, max_size_mb=50)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    # Parse XML
    try:
        root_element = parse_xml_string(xml_content)
    except ET.ParseError as e:
        raise HTTPException(status_code=400, detail=f"Malformed XML: {str(e)}")

    # Convert to node structure
    root_node = xml_element_to_node(root_element)

    # Calculate stats
    total_nodes, max_depth = calculate_tree_stats(root_node)

    return XmlParseResponse(
        root=root_node,
        total_nodes=total_nodes,
        max_depth=max_depth,
    )


@router.post("/flatten", response_model=List[XmlFlattenedRecord])
async def flatten_xml(root: XmlNode):
    """
    Flatten XML node structure into list of records.

    Args:
        root: Root XmlNode

    Returns:
        List of flattened records
    """
    return flatten_xml_node(root)


@router.post("/search", response_model=List[XmlNode])
async def search_xml(request: dict):
    """
    Search XML nodes matching query.

    Args:
        request: Dictionary containing 'root' (XmlNode) and 'search_request' (XmlSearchRequest)

    Returns:
        List of matching XmlNodes
    """
    try:
        root = XmlNode(**request.get("root", {}))
        search_request = XmlSearchRequest(**request.get("search_request", {}))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid request format: {str(e)}")
    
    matches = search_xml_node(
        root, search_request.query, search_request.search_in
    )
    return matches


@router.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy"}

