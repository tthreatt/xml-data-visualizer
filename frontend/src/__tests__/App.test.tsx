import { render, screen } from '@testing-library/react';
import App from '../App';

describe('App', () => {
  it('renders the header', () => {
    render(<App />);
    expect(screen.getByText('XML Data Visualizer')).toBeInTheDocument();
  });

  it('renders file upload when no data is loaded', () => {
    render(<App />);
    expect(screen.getByText('Upload XML File')).toBeInTheDocument();
  });
});

