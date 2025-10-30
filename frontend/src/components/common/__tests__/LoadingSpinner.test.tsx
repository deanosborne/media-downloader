import React from 'react';
import { render, screen } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import LoadingSpinner from '../LoadingSpinner';

const theme = createTheme();

const renderWithTheme = (component: React.ReactElement) => {
  return render(
    <ThemeProvider theme={theme}>
      {component}
    </ThemeProvider>
  );
};

describe('LoadingSpinner', () => {
  it('renders spinner without message', () => {
    renderWithTheme(<LoadingSpinner />);
    
    const spinner = screen.getByRole('progressbar');
    expect(spinner).toBeInTheDocument();
  });

  it('renders spinner with message', () => {
    const message = 'Loading data...';
    renderWithTheme(<LoadingSpinner message={message} />);
    
    const spinner = screen.getByRole('progressbar');
    const messageText = screen.getByText(message);
    
    expect(spinner).toBeInTheDocument();
    expect(messageText).toBeInTheDocument();
  });

  it('applies custom size', () => {
    renderWithTheme(<LoadingSpinner size={60} />);
    
    const spinner = screen.getByRole('progressbar');
    expect(spinner).toBeInTheDocument();
  });

  it('applies different color variants', () => {
    renderWithTheme(<LoadingSpinner color="secondary" />);
    
    const spinner = screen.getByRole('progressbar');
    expect(spinner).toBeInTheDocument();
  });

  it('renders as overlay when overlay prop is true', () => {
    const { container } = renderWithTheme(<LoadingSpinner overlay />);
    
    const overlayContainer = container.firstChild as HTMLElement;
    expect(overlayContainer).toHaveStyle({
      position: 'absolute',
    });
  });

  it('centers content when centered prop is true', () => {
    const { container } = renderWithTheme(<LoadingSpinner centered />);
    
    const spinnerContainer = container.firstChild as HTMLElement;
    expect(spinnerContainer).toHaveStyle({
      'justify-content': 'center',
    });
  });

  it('applies custom sx styles', () => {
    const customSx = { backgroundColor: 'red' };
    const { container } = renderWithTheme(<LoadingSpinner sx={customSx} />);
    
    const spinnerContainer = container.firstChild as HTMLElement;
    expect(spinnerContainer).toHaveStyle({
      'background-color': 'rgb(255, 0, 0)',
    });
  });
});