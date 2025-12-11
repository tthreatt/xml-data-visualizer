"""
FastAPI application entry point.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import xml_parser, csv_parser
from routers import csv_export
from database import init_db

app = FastAPI(
    title="XML Data Visualizer API",
    description="API for parsing, visualizing, and exporting XML and CSV data",
    version="1.0.0",
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],  # Vite and common React ports
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize database on startup
@app.on_event("startup")
async def startup_event():
    """Initialize database tables on application startup."""
    init_db()

# Include routers
app.include_router(xml_parser.router)
app.include_router(csv_parser.router)
app.include_router(csv_export.router)


@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "message": "XML & CSV Data Visualizer API",
        "version": "1.0.0",
        "docs": "/docs",
    }

