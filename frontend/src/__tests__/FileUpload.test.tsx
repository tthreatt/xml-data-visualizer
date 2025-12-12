import { render, screen } from '@testing-library/react';
import FileUpload from '../components/FileUpload';

describe('FileUpload', () => {
  const mockOnUpload = jest.fn();

  beforeEach(() => {
    mockOnUpload.mockClear();
  });

  it('renders upload area', () => {
    render(<FileUpload onUpload={mockOnUpload} loading={false} error={null} />);
    expect(screen.getByText('Upload XML File')).toBeInTheDocument();
  });

  it('shows loading state', () => {
    render(<FileUpload onUpload={mockOnUpload} loading={true} error={null} />);
    expect(screen.getByText('Processing XML file...')).toBeInTheDocument();
  });

  it('shows error message', () => {
    const errorMessage = 'Invalid XML file';
    render(
      <FileUpload
        onUpload={mockOnUpload}
        loading={false}
        error={errorMessage}
      />
    );
    expect(screen.getByText(/Error:/)).toBeInTheDocument();
    expect(screen.getByText(errorMessage)).toBeInTheDocument();
  });
});
