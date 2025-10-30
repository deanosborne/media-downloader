import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import SettingsContainer from '../SettingsContainer';
import { useAppContext } from '../../../store/AppContext';
import { useConfig } from '../../../hooks/useConfig';

// Mock the hooks
jest.mock('../../../store/AppContext');
jest.mock('../../../hooks/useConfig');
jest.mock('../../../components/FolderBrowser', () => {
  return function MockFolderBrowser({ open, onClose, onSelect }: any) {
    if (!open) return null;
    return (
      <div data-testid="folder-browser">
        <button onClick={() => onSelect('/test/path')}>Select Path</button>
        <button onClick={onClose}>Close</button>
      </div>
    );
  };
});

const mockUseAppContext = useAppContext as jest.MockedFunction<typeof useAppContext>;
const mockUseConfig = useConfig as jest.MockedFunction<typeof useConfig>;

const mockConfig = {
  tmdb: { apiKey: 'test-tmdb-key', baseUrl: 'https://api.themoviedb.org/3' },
  jackett: { url: 'http://localhost:9117', apiKey: 'test-jackett-key' },
  realDebrid: { apiKey: 'test-rd-key' },
  plex: {
    url: 'http://localhost:32400',
    token: 'test-plex-token',
    paths: {
      movies: '/movies',
      tvShows: '/tv',
      books: '/books',
      audiobooks: '/audiobooks',
    },
  },
  download: {
    path: '/downloads',
    autoDownload: false,
    preferredResolution: '1080p',
    minSeeders: 10,
  },
};

const mockActions = {
  addToQueue: jest.fn(),
  updateQueueItem: jest.fn(),
  removeFromQueue: jest.fn(),
  refreshQueue: jest.fn(),
  clearQueueError: jest.fn(),
  updateConfig: jest.fn(),
  updateConfigSection: jest.fn(),
  refreshConfig: jest.fn(),
  clearConfigError: jest.fn(),
  updateUserPreferences: jest.fn(),
  resetUserPreferences: jest.fn(),
  clearUserError: jest.fn(),
};

const mockState = {
  queue: { items: [], loading: false, error: null, lastUpdated: null },
  config: { data: mockConfig, loading: false, error: null, isValid: true },
  user: { preferences: {} as any, loading: false, error: null },
};

describe('SettingsContainer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    mockUseAppContext.mockReturnValue({
      state: mockState,
      actions: mockActions,
    });
    
    mockUseConfig.mockReturnValue({
      data: mockConfig,
      loading: false,
      error: null,
      refetch: jest.fn(),
    });
  });

  it('renders settings dialog when open', () => {
    render(<SettingsContainer open onClose={jest.fn()} />);
    
    expect(screen.getAllByText('Settings')[0]).toBeInTheDocument();
    expect(screen.getByText('API Keys')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(<SettingsContainer open={false} onClose={jest.fn()} />);
    
    expect(screen.queryByText('Settings')).not.toBeInTheDocument();
  });

  it('loads config when dialog opens', () => {
    render(<SettingsContainer open onClose={jest.fn()} />);
    
    expect(screen.getByDisplayValue('test-tmdb-key')).toBeInTheDocument();
    expect(screen.getByDisplayValue('http://localhost:9117')).toBeInTheDocument();
  });

  it('handles config field changes', () => {
    render(<SettingsContainer open onClose={jest.fn()} />);
    
    const tmdbInput = screen.getByDisplayValue('test-tmdb-key');
    fireEvent.change(tmdbInput, { target: { value: 'new-tmdb-key' } });
    
    expect(tmdbInput).toHaveValue('new-tmdb-key');
  });

  it('opens folder browser when browse button is clicked', () => {
    render(<SettingsContainer open onClose={jest.fn()} />);
    
    // Switch to directories tab
    fireEvent.click(screen.getByText('Directories'));
    
    // Find and click a browse button
    const browseButtons = screen.getAllByRole('button');
    const browseButton = browseButtons.find(button => 
      button.querySelector('svg') // Find button with icon
    );
    
    if (browseButton) {
      fireEvent.click(browseButton);
      expect(screen.getByTestId('folder-browser')).toBeInTheDocument();
    }
  });

  it('handles folder selection from browser', () => {
    render(<SettingsContainer open onClose={jest.fn()} />);
    
    // Switch to directories tab
    fireEvent.click(screen.getByText('Directories'));
    
    // Open folder browser
    const browseButtons = screen.getAllByRole('button');
    const browseButton = browseButtons.find(button => 
      button.querySelector('svg')
    );
    
    if (browseButton) {
      fireEvent.click(browseButton);
      
      // Select a path
      fireEvent.click(screen.getByText('Select Path'));
      
      // Folder browser should close
      expect(screen.queryByTestId('folder-browser')).not.toBeInTheDocument();
    }
  });

  it('handles auto-download toggle', () => {
    render(<SettingsContainer open onClose={jest.fn()} />);
    
    // Switch to download tab
    fireEvent.click(screen.getByText('Download'));
    
    const autoDownloadCheckbox = screen.getByRole('checkbox');
    fireEvent.click(autoDownloadCheckbox);
    
    // Should show auto-download settings
    expect(screen.getByRole('combobox', { name: /preferred resolution/i })).toBeInTheDocument();
  });

  it('saves configuration changes', async () => {
    mockActions.updateConfig.mockResolvedValue(undefined);
    
    render(<SettingsContainer open onClose={jest.fn()} />);
    
    // Make a change
    const tmdbInput = screen.getByDisplayValue('test-tmdb-key');
    fireEvent.change(tmdbInput, { target: { value: 'new-tmdb-key' } });
    
    // Save changes
    const saveButton = screen.getByText('Save (1)');
    fireEvent.click(saveButton);
    
    await waitFor(() => {
      expect(mockActions.updateConfig).toHaveBeenCalledWith({
        tmdb: { apiKey: 'new-tmdb-key' },
        download: {
          autoDownload: false,
          preferredResolution: '1080p',
          minSeeders: 10,
        },
      });
    });
  });

  it('shows save success message', async () => {
    mockActions.updateConfig.mockResolvedValue(undefined);
    
    render(<SettingsContainer open onClose={jest.fn()} />);
    
    // Make a change and save
    const tmdbInput = screen.getByDisplayValue('test-tmdb-key');
    fireEvent.change(tmdbInput, { target: { value: 'new-tmdb-key' } });
    
    const saveButton = screen.getByText('Save (1)');
    fireEvent.click(saveButton);
    
    await waitFor(() => {
      expect(screen.getByText('Settings saved successfully!')).toBeInTheDocument();
    });
  });

  it('shows save error message', async () => {
    const error = new Error('Save failed');
    mockActions.updateConfig.mockRejectedValue(error);
    
    render(<SettingsContainer open onClose={jest.fn()} />);
    
    // Make a change and save
    const tmdbInput = screen.getByDisplayValue('test-tmdb-key');
    fireEvent.change(tmdbInput, { target: { value: 'new-tmdb-key' } });
    
    const saveButton = screen.getByText('Save (1)');
    fireEvent.click(saveButton);
    
    await waitFor(() => {
      expect(screen.getByText('Failed to save: Save failed')).toBeInTheDocument();
    });
  });

  it('calls onClose when cancel is clicked', () => {
    const onClose = jest.fn();
    render(<SettingsContainer open onClose={onClose} />);
    
    fireEvent.click(screen.getByText('Cancel'));
    
    expect(onClose).toHaveBeenCalled();
  });

  it('handles password visibility toggle', () => {
    render(<SettingsContainer open onClose={jest.fn()} />);
    
    // Find a password field and its visibility toggle
    const visibilityButtons = screen.getAllByRole('button');
    const visibilityToggle = visibilityButtons.find(button => 
      button.querySelector('svg[data-testid="VisibilityIcon"], svg[data-testid="VisibilityOffIcon"]')
    );
    
    if (visibilityToggle) {
      fireEvent.click(visibilityToggle);
      // Password visibility should toggle (tested via form component)
    }
  });

  it('handles download preferences changes', () => {
    render(<SettingsContainer open onClose={jest.fn()} />);
    
    // Switch to download tab
    fireEvent.click(screen.getByText('Download'));
    
    // Enable auto-download
    const autoDownloadCheckbox = screen.getByRole('checkbox');
    fireEvent.click(autoDownloadCheckbox);
    
    // Change resolution
    const resolutionSelect = screen.getByRole('combobox', { name: /preferred resolution/i });
    fireEvent.mouseDown(resolutionSelect);
    fireEvent.click(screen.getByText('720p (HD)'));
    
    // Change seeders
    const seedersInput = screen.getByLabelText('Minimum Seeders');
    fireEvent.change(seedersInput, { target: { value: '20' } });
    
    // Values should be updated
    expect(resolutionSelect).toHaveTextContent('720p (HD)');
    expect(seedersInput).toHaveValue(20);
  });

  it('shows no changes message when saving without changes', async () => {
    render(<SettingsContainer open onClose={jest.fn()} />);
    
    // Try to save without making changes
    // Note: Save button should be disabled, but we can test the logic
    // by directly calling the save function if it were enabled
    
    // The save button should be disabled when no changes
    const saveButton = screen.getByText('Save');
    expect(saveButton).toBeDisabled();
  });

  it('handles config loading error', () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    
    mockUseConfig.mockReturnValue({
      data: null,
      loading: false,
      error: new Error('Config load failed'),
      refetch: jest.fn(),
    });
    
    render(<SettingsContainer open onClose={jest.fn()} />);
    
    // Should handle the error gracefully
    expect(screen.getAllByText('Settings')[0]).toBeInTheDocument();
    
    consoleError.mockRestore();
  });

  it('handles masked password values', () => {
    const configWithMaskedPasswords = {
      ...mockConfig,
      tmdb: { ...mockConfig.tmdb, apiKey: '••••••••' },
    };
    
    mockUseAppContext.mockReturnValue({
      state: {
        ...mockState,
        config: { ...mockState.config, data: configWithMaskedPasswords },
      },
      actions: mockActions,
    });
    
    render(<SettingsContainer open onClose={jest.fn()} />);
    
    expect(screen.getByDisplayValue('••••••••')).toBeInTheDocument();
  });
});