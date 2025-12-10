export interface CsvRow {
  data: Record<string, string>;
}

export interface CsvData {
  headers: string[];
  rows: CsvRow[];
  total_rows: number;
  total_columns: number;
}

export interface CsvNode {
  name: string;
  path: string;
  value: string | null;
  children: CsvNode[];
  attributes: Record<string, string>;
}

export interface CsvParseResponse {
  data: CsvData;
  root: CsvNode;
  total_rows: number;
  total_columns: number;
}

export interface CsvImportResponse {
  import_id: number;
  total_rows: number;
  total_columns: number;
  headers: string[];
  status: string;
}

export interface CsvRowsResponse {
  rows: Record<string, string>[];
  total_count: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface CsvColumnsResponse {
  columns: string[];
  groups: Record<string, string[]>;
}
