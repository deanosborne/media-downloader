import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import SettingsForm from '../SettingsForm';

const mockProps = {
  config: {
    TMDB_API_KEY: 'test-tmdb-key',
    JACKETT_URL: 'http://localhost:9117',
    JACKETT_API_KEY: 'test-jackett-key',
    REAL_DEBRID_API_KEY: 'test-rd-key',
    PLEX_URL: 'http://localhost:32400',
    PLEX_TOKEN: 'test-plex-token',
    DOWNLOAD_PATH: '/downloads',
    PLEX_MOVIE_PATH: '/movies',
    PLEX_TV_PATH: '/tv',
    PLEX_BOOKS_PATH: '/books',
    PLEX_AUDIOBOOKS_PATH: '/audiobooks',
  },
  changedFields: new Set<string>(),
  showPasswords: {},
  autoDownload: false,
  preferredResolution: '1080p',
  preferredMinSeeders: 10,
  onConfigChange: jest.fn(),
  onTogglePasswordVisibility: jest.fn(),
  onBrowse: jest.fn(),
  onAutoDownloadChange: jest.fn(),
  onPreferredResolutionChange: jest.fn(),
  onPreferredMinSeedersChange: jest.fn(),
  onSave: jest.fn(),
  onCancel: jest.fn(),
};

describe('SettingsForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders settings form with tabs', () => {
    render(<SettingsForm {...mockProps} />);
    
    expect(screen.getByText('Settings')).toBeInTheDocument();
    expect(screen.getByText('API Keys')).toBeInTheDocument();
    expect(screen.getByText('Directories')).toBeInTheDocument();
    expect(screen.getByText('Download')).toBeInTheDocument();
  });

  it('displays API keys tab content by default', () => {
    render(<SettingsForm {...mockProps} />);
    
    expect(screen.getByText('TMDB')).toBeInTheDocument();
    expect(screen.getByText('Jackett')).toBeInTheDocument();
    expect(screen.getByText('Real-Debrid')).toBeInTheDocument();
    expect(screen.getByText('Plex')).toBeInTheDocument();
  });

  it('switches to directories tab when clicked', () => {
    render(<SettingsForm {...mockProps} />);
    
    fireEvent.click(screen.getByText('Directories'));
    
    expect(screen.getByLabelText('Download Path')).toBeInTheDocument();
    expect(screen.getByLabelText('Plex Movie Library Path')).toBeInTheDocument();
  });

  it('switches to download tab when clicked', () => {
    render(<SettingsForm {...mockProps} />);
    
    fireEvent.click(screen.getByText('Download'));
    
    expect(screen.getByText('Download Preferences')).toBeInTheDocument();
    expect(screen.getByText('Auto-download with preferred settings (skip quality selection)')).toBeInTheDocument();
  });

  it('calls onConfigChange when input values change', () => {
    render(<SettingsForm {...mockProps} />);
    
    const tmdbInput = screen.getByLabelText('TMDB API Key');
    fireEvent.change(tmdbInput, { target: { value: 'new-tmdb-key' } });
    
    expect(mockProps.onConfigChange).toHaveBeenCalledWith('TMDB_API_KEY', 'new-tmdb-key');
  });

  it('toggles password visibility when eye icon is clicked', () => {
    render(<SettingsForm {...mockProps} />);
    
    const visibilityButton = screen.getAllByRole('button')[0]; // First visibility toggle
    fireEvent.click(visibilityButton);
    
    expect(mockProps.onTogglePasswordVisibility).toHaveBeenCalled();
  });

  it('calls onBrowse when browse button is clicked', () => {
    render(<SettingsForm {...mockProps} />);
    
    fireEvent.click(screen.getByText('Directories'));
    
    const browseButtons = screen.getAllByRole('button');
    const browseButton = browseButtons.find(button => 
      button.querySelector('svg') // Find button with icon
    );
    
    if (browseButton) {
      fireEvent.click(browseButton);
      expect(mockProps.onBrowse).toHaveBeenCalled();
    }
  });

  it('shows changed fields indicator', () => {
    const propsWithChanges = {
      ...mockProps,
      changedFields: new Set(['TMDB_API_KEY', 'JACKETT_URL']),
    };
    
    render(<SettingsForm {...propsWithChanges} />);
    
    expect(screen.getByText('2 unsaved changes')).toBeInTheDocument();
  });

  it('shows save message when provided', () => {
    const propsWithMessage = {
      ...mockProps,
      saveMessage: {
        type: 'success' as const,
        text: 'Settings saved successfully!',
      },
    };
    
    render(<SettingsForm {...propsWithMessage} />);
    
    expect(screen.getByText('Settings saved successfully!')).toBeInTheDocument();
  });

  it('handles auto-download toggle', () => {
    render(<SettingsForm {...mockProps} />);
    
    fireEvent.click(screen.getByText('Download'));
    
    const autoDownloadCheckbox = screen.getByRole('checkbox');
    fireEvent.click(autoDownloadCheckbox);
    
    expect(mockProps.onAutoDownloadChange).toHaveBeenCalledWith(true);
  });

  it('shows auto-download settings when enabled', () => {
    const propsWithAutoDownload = {
      ...mockProps,
      autoDownload: true,
    };
    
    render(<SettingsForm {...propsWithAutoDownload} />);
    
    fireEvent.click(screen.getByText('Download'));
    
    expect(screen.getByRole('combobox', { name: /preferred resolution/i })).toBeInTheDocument();
    expect(screen.getByLabelText('Minimum Seeders')).toBeInTheDocument();
  });

  it('calls onPreferredResolutionChange when resolution changes', () => {
    const propsWithAutoDownload = {
      ...mockProps,
      autoDownload: true,
    };
    
    render(<SettingsForm {...propsWithAutoDownload} />);
    
    fireEvent.click(screen.getByText('Download'));
    
    const resolutionSelect = screen.getByRole('combobox', { name: /preferred resolution/i });
    fireEvent.mouseDown(resolutionSelect);
    
    const option720p = screen.getByText('720p (HD)');
    fireEvent.click(option720p);
    
    expect(mockProps.onPreferredResolutionChange).toHaveBeenCalledWith('720p');
  });

  it('calls onPreferredMinSeedersChange when seeders value changes', () => {
    const propsWithAutoDownload = {
      ...mockProps,
      autoDownload: true,
    };
    
    render(<SettingsForm {...propsWithAutoDownload} />);
    
    fireEvent.click(screen.getByText('Download'));
    
    const seedersInput = screen.getByLabelText('Minimum Seeders');
    fireEvent.change(seedersInput, { target: { value: '20' } });
    
    expect(mockProps.onPreferredMinSeedersChange).toHaveBeenCalledWith(20);
  });

  it('calls onSave when save button is clicked', () => {
    const propsWithChanges = {
      ...mockProps,
      changedFields: new Set(['TMDB_API_KEY']),
    };
    
    render(<SettingsForm {...propsWithChanges} />);
    
    fireEvent.click(screen.getByText('Save (1)'));
    
    expect(mockProps.onSave).toHaveBeenCalled();
  });

  it('calls onCancel when cancel button is clicked', () => {
    render(<SettingsForm {...mockProps} />);
    
    fireEvent.click(screen.getByText('Cancel'));
    
    expect(mockProps.onCancel).toHaveBeenCalled();
  });

  it('disables save button when no changes', () => {
    render(<SettingsForm {...mockProps} />);
    
    const saveButton = screen.getByText('Save');
    expect(saveButton).toBeDisabled();
  });

  it('disables save button when loading', () => {
    const propsWithChanges = {
      ...mockProps,
      changedFields: new Set(['TMDB_API_KEY']),
      loading: true,
    };
    
    render(<SettingsForm {...propsWithChanges} />);
    
    const saveButton = screen.getByText('Save (1)');
    expect(saveButton).toBeDisabled();
  });

  it('shows helper links for API keys', () => {
    render(<SettingsForm {...mockProps} />);
    
    expect(screen.getAllByText('here')[0]).toBeInTheDocument();
  });

  it('shows masked password indicator', () => {
    const propsWithMaskedPassword = {
      ...mockProps,
      config: {
        ...mockProps.config,
        TMDB_API_KEY: '••••••••',
      },
    };
    
    render(<SettingsForm {...propsWithMaskedPassword} />);
    
    expect(screen.getByText('✓ Already configured')).toBeInTheDocument();
  });

  it('shows change indicator for modified fields', () => {
    const propsWithChanges = {
      ...mockProps,
      changedFields: new Set(['TMDB_API_KEY']),
    };
    
    render(<SettingsForm {...propsWithChanges} />);
    
    expect(screen.getByText('⚠ Will be updated')).toBeInTheDocument();
  });
});