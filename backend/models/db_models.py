"""
SQLAlchemy database models for CSV data storage.
"""

from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey, Index, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base


class CsvImport(Base):
    """Model for CSV import sessions."""
    
    __tablename__ = "csv_imports"
    
    id = Column(Integer, primary_key=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    total_rows = Column(Integer, nullable=False)
    total_columns = Column(Integer, nullable=False)
    headers = Column(JSON, nullable=False)  # Array of column headers
    status = Column(String(20), default="processing", nullable=False)  # processing, completed, error
    error_message = Column(Text, nullable=True)
    
    # Relationships
    rows = relationship("CsvRow", back_populates="import_session", cascade="all, delete-orphan")
    csv_metadata = relationship("CsvMetadata", back_populates="import_session", uselist=False, cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<CsvImport(id={self.id}, rows={self.total_rows}, status={self.status})>"


class CsvRow(Base):
    """Model for individual CSV rows."""
    
    __tablename__ = "csv_rows"
    
    id = Column(Integer, primary_key=True, index=True)
    import_id = Column(Integer, ForeignKey("csv_imports.id"), nullable=False, index=True)
    row_data = Column(JSON, nullable=False)  # All column values as JSON object
    row_index = Column(Integer, nullable=False)  # Original row number in CSV
    
    # Relationships
    import_session = relationship("CsvImport", back_populates="rows")
    
    # Indexes for performance
    __table_args__ = (
        Index("idx_import_row", "import_id", "row_index"),
    )
    
    def __repr__(self):
        return f"<CsvRow(id={self.id}, import_id={self.import_id}, row_index={self.row_index})>"


class CsvMetadata(Base):
    """Model for CSV import metadata."""
    
    __tablename__ = "csv_metadata"
    
    import_id = Column(Integer, ForeignKey("csv_imports.id"), primary_key=True)
    file_names = Column(JSON, nullable=False)  # Array of source file names
    combined_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Relationships
    import_session = relationship("CsvImport", back_populates="csv_metadata")
    
    def __repr__(self):
        return f"<CsvMetadata(import_id={self.import_id}, files={self.file_names})>"
