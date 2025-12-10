import { useRef, useState, DragEvent } from 'react';
import './FileUpload.css';

type FileType = 'xml' | 'csv';

interface FileUploadProps {
  onUpload: (file: File) => void;
  onUploadMultiple?: (files: File[]) => void;
  loading: boolean;
  error: string | null;
  fileType?: FileType;
  multiple?: boolean;
}

export default function FileUpload({
  onUpload,
  onUploadMultiple,
  loading,
  error,
  fileType = 'xml',
  multiple = false,
}: FileUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const isValidFile = (file: File): boolean => {
    if (fileType === 'xml') {
      return (
        file.type === 'application/xml' ||
        file.type === 'text/xml' ||
        file.name.endsWith('.xml')
      );
    } else {
      return (
        file.type === 'text/csv' ||
        file.type === 'application/vnd.ms-excel' ||
        file.name.endsWith('.csv')
      );
    }
  };

  const handleFileSelect = (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const fileArray = Array.from(files);
    const validFiles = fileArray.filter(isValidFile);

    if (validFiles.length === 0) {
      alert(`Please select valid ${fileType.toUpperCase()} file(s)`);
      return;
    }

    if (multiple && onUploadMultiple) {
      onUploadMultiple(validFiles);
    } else {
      onUpload(validFiles[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFileSelect(e.target.files);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileSelect(e.dataTransfer.files);
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const acceptTypes =
    fileType === 'xml' ? '.xml,application/xml,text/xml' : '.csv,text/csv';
  const fileTypeLabel = fileType.toUpperCase();
  const maxSize = fileType === 'xml' ? '50MB' : '100MB';
  const uploadText = multiple
    ? `Drag and drop your ${fileTypeLabel} files here, or click to browse`
    : `Drag and drop your ${fileTypeLabel} file here, or click to browse`;

  return (
    <div className="file-upload-container">
      <div
        className={`file-upload-area ${isDragging ? 'dragging' : ''} ${loading ? 'loading' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={acceptTypes}
          onChange={handleFileInputChange}
          style={{ display: 'none' }}
          disabled={loading}
          multiple={multiple}
        />

        {loading ? (
          <div className="upload-content">
            <div className="spinner"></div>
            <p>
              Processing {fileTypeLabel} file{multiple ? 's' : ''}...
            </p>
          </div>
        ) : (
          <div className="upload-content">
            <svg
              className="upload-icon"
              width="64"
              height="64"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            <h2>
              Upload {fileTypeLabel} File{multiple ? 's' : ''}
            </h2>
            <p>{uploadText}</p>
            <p className="file-info">Maximum file size: {maxSize}</p>
            {multiple && (
              <p className="file-info">You can select multiple files</p>
            )}
          </div>
        )}
      </div>

      {error && (
        <div className="error-message">
          <strong>Error:</strong> {error}
        </div>
      )}
    </div>
  );
}
