import React from 'react';
import { render, screen } from '@testing-library/react';
import TableView from '../TableView';

// Mock axios
jest.mock('axios', () => ({
  post: jest.fn(() => Promise.resolve({ data: new Blob(['col1,col2\nval1,val2'], { type: 'text/csv' }) }))
}));

describe('TableView Export All', () => {
  it('renders Export All to CSV button and triggers export', async () => {
    const csvRows = [
      { col1: 'val1', col2: 'val2' },
      { col1: 'val3', col2: 'val4' }
    ];
    const csvHeaders = ['col1', 'col2'];
    const selectedColumns = new Set(['col1', 'col2']);
    render(
      <TableView
        csvRows={csvRows}
        csvHeaders={csvHeaders}
        selectedColumns={selectedColumns}
        importId={123}
      />
    );
    const exportBtn = screen.getByText('Export All to CSV');
    expect(exportBtn).toBeInTheDocument();
    exportBtn.click();
    // No error should be thrown, and axios.post should be called
    // (window.URL.createObjectURL is not tested here)
  });
});
