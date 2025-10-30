import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, setupIntegrationTest, cleanupIntegrationTest, mockApiResponses } from './setup';
import SettingsContainer from '../../features/settings/SettingsContainer';
import App from '../../App';

describe('Settings and Configuration Workflow Integration Tests', () => {
  beforeEach(() => {
    setupIntegrationTest();
  });

  afterEach(() => {
    cleanupIntegrationTest();
  });

  describe('Settings Dialog Integration', () => {
    it('should open and close settings dialog', async () => {
      const user = userEvent.setup();
      const onClose = jest.fn();
      const { cleanup } = renderWithProviders(
        <SettingsContainer open={true} onClose={onClose} />
      );

      try {
        // Dialog should be visible
        await waitFor(() => {
          expect(screen.getByRole('dialog')).toBeInTheDocument();
        });

        // Close dialog by clicking outside or using escape key
        await user.keyboard('{Escape}');

        expect(onClose).toHaveBeenCalled();
      } finally {
        cleanup();
      }
    });

    it('should load and display current configuration', async () => {
      const { cleanup } = renderWithProviders(
        <SettingsContainer open={true} onClose={jest.fn()} />
      );

      try {
        await waitFor(() => {
          expect(screen.getByRole('dialog')).toBeInTheDocument();
        });

        // Verify configuration sections are displayed
        expect(screen.getByText(/tmdb configuration/i)).toBeInTheDocument();
        expect(screen.getByText(/jackett configuration/i)).toBeInTheDocument();
        expect(screen.getByText(/real-debrid configuration/i)).toBeInTheDocument();
        expect(screen.getByText(/plex configuration/i)).toBeInTheDocument();
        expect(screen.getByText(/download settings/i)).toBeInTheDocument();

        // Verify masked sensitive values
        const maskedInputs = screen.getAllByDisplayValue('***MASKED***');
        expect(maskedInputs.length).toBeGreaterThan(0);
      } finally {
        cleanup();
      }
    });

    it('should validate configuration inputs', async () => {
      const user = userEvent.setup();
      const { cleanup } = renderWithProviders(
        <SettingsContainer open={true} onClose={jest.fn()} />
      );

      try {
        await waitFor(() => {
          expect(screen.getByRole('dialog')).toBeInTheDocument();
        });

        // Find TMDB API key input
        const tmdbInput = screen.getByLabelText(/tmdb api key/i);
        
        // Clear and enter invalid value
        await user.clear(tmdbInput);
        await user.type(tmdbInput, 'invalid-key');

        // Try to save
        const saveButton = screen.getByRole('button', { name: /save/i });
        await user.click(saveButton);

        // Should show validation error
        await waitFor(() => {
          expect(screen.getByText(/invalid api key format/i)).toBeInTheDocument();
        });
      } finally {
        cleanup();
      }
    });

    it('should save configuration changes', async () => {
      const user = userEvent.setup();
      let configSaved = false;
      
      const mockResponses = {
        '/api/config': mockApiResponses.config,
        '/api/config/update': {
          success: true,
          data: { message: 'Configuration updated successfully' }
        }
      };

      const { cleanup } = renderWithProviders(
        <SettingsContainer open={true} onClose={jest.fn()} />,
        { mockResponses }
      );

      try {
        await waitFor(() => {
          expect(screen.getByRole('dialog')).toBeInTheDocument();
        });

        // Update download path
        const downloadPathInput = screen.getByLabelText(/download path/i);
        await user.clear(downloadPathInput);
        await user.type(downloadPathInput, '/new/download/path');

        // Save changes
        const saveButton = screen.getByRole('button', { name: /save/i });
        await user.click(saveButton);

        configSaved = true;

        // Should show success message
        await waitFor(() => {
          expect(screen.getByText(/configuration updated successfully/i)).toBeInTheDocument();
        });
      } finally {
        cleanup();
      }
    });
  });

  describe('Configuration Validation', () => {
    it('should test API connections', async () => {
      const user = userEvent.setup();
      const mockResponses = {
        '/api/config': mockApiResponses.config,
        '/api/config/test': {
          success: true,
          data: {
            tmdb: { status: 'success', message: 'Connection successful' },
            jackett: { status: 'success', message: 'Connection successful' },
            realDebrid: { status: 'error', message: 'Invalid API key' },
            plex: { status: 'success', message: 'Connection successful' }
          }
        }
      };

      const { cleanup } = renderWithProviders(
        <SettingsContainer open={true} onClose={jest.fn()} />,
        { mockResponses }
      );

      try {
        await waitFor(() => {
          expect(screen.getByRole('dialog')).toBeInTheDocument();
        });

        // Click test connections button
        const testButton = screen.getByRole('button', { name: /test connections/i });
        await user.click(testButton);

        // Wait for test results
        await waitFor(() => {
          expect(screen.getByText(/connection successful/i)).toBeInTheDocument();
        });

        // Verify individual service status
        expect(screen.getByText(/tmdb.*success/i)).toBeInTheDocument();
        expect(screen.getByText(/jackett.*success/i)).toBeInTheDocument();
        expect(screen.getByText(/real-debrid.*error/i)).toBeInTheDocument();
        expect(screen.getByText(/invalid api key/i)).toBeInTheDocument();
        expect(screen.getByText(/plex.*success/i)).toBeInTheDocument();
      } finally {
        cleanup();
      }
    });

    it('should handle configuration test failures', async () => {
      const user = userEvent.setup();
      const mockResponses = {
        '/api/config': mockApiResponses.config,
        '/api/config/test': {
          success: false,
          error: 'Unable to test connections'
        }
      };

      const { cleanup } = renderWithProviders(
        <SettingsContainer open={true} onClose={jest.fn()} />,
        { mockResponses }
      );

      try {
        await waitFor(() => {
          expect(screen.getByRole('dialog')).toBeInTheDocument();
        });

        const testButton = screen.getByRole('button', { name: /test connections/i });
        await user.click(testButton);

        await waitFor(() => {
          expect(screen.getByText(/unable to test connections/i)).toBeInTheDocument();
        });
      } finally {
        cleanup();
      }
    });
  });

  describe('Settings Categories', () => {
    it('should navigate between settings categories', async () => {
      const user = userEvent.setup();
      const { cleanup } = renderWithProviders(
        <SettingsContainer open={true} onClose={jest.fn()} />
      );

      try {
        await waitFor(() => {
          expect(screen.getByRole('dialog')).toBeInTheDocument();
        });

        // Should start with general settings
        expect(screen.getByText(/tmdb configuration/i)).toBeInTheDocument();

        // Navigate to download settings
        const downloadTab = screen.getByRole('tab', { name: /download/i });
        await user.click(downloadTab);

        expect(screen.getByText(/download path/i)).toBeInTheDocument();
        expect(screen.getByText(/auto download/i)).toBeInTheDocument();
        expect(screen.getByText(/minimum seeders/i)).toBeInTheDocument();

        // Navigate to services settings
        const servicesTab = screen.getByRole('tab', { name: /services/i });
        await user.click(servicesTab);

        expect(screen.getByText(/jackett configuration/i)).toBeInTheDocument();
        expect(screen.getByText(/real-debrid configuration/i)).toBeInTheDocument();
      } finally {
        cleanup();
      }
    });

    it('should preserve unsaved changes when switching tabs', async () => {
      const user = userEvent.setup();
      const { cleanup } = renderWithProviders(
        <SettingsContainer open={true} onClose={jest.fn()} />
      );

      try {
        await waitFor(() => {
          expect(screen.getByRole('dialog')).toBeInTheDocument();
        });

        // Make changes in general settings
        const downloadPathInput = screen.getByLabelText(/download path/i);
        await user.clear(downloadPathInput);
        await user.type(downloadPathInput, '/modified/path');

        // Switch to services tab
        const servicesTab = screen.getByRole('tab', { name: /services/i });
        await user.click(servicesTab);

        // Switch back to general
        const generalTab = screen.getByRole('tab', { name: /general/i });
        await user.click(generalTab);

        // Changes should be preserved
        expect(screen.getByDisplayValue('/modified/path')).toBeInTheDocument();
      } finally {
        cleanup();
      }
    });
  });

  describe('Advanced Settings', () => {
    it('should toggle advanced settings visibility', async () => {
      const user = userEvent.setup();
      const { cleanup } = renderWithProviders(
        <SettingsContainer open={true} onClose={jest.fn()} />
      );

      try {
        await waitFor(() => {
          expect(screen.getByRole('dialog')).toBeInTheDocument();
        });

        // Advanced settings should be hidden initially
        expect(screen.queryByText(/debug logging/i)).not.toBeInTheDocument();

        // Toggle advanced settings
        const advancedToggle = screen.getByRole('button', { name: /show advanced/i });
        await user.click(advancedToggle);

        // Advanced settings should now be visible
        expect(screen.getByText(/debug logging/i)).toBeInTheDocument();
        expect(screen.getByText(/connection timeout/i)).toBeInTheDocument();
        expect(screen.getByText(/retry attempts/i)).toBeInTheDocument();
      } finally {
        cleanup();
      }
    });

    it('should reset settings to defaults', async () => {
      const user = userEvent.setup();
      const mockResponses = {
        '/api/config': mockApiResponses.config,
        '/api/config/reset': {
          success: true,
          data: {
            'download.path': '/downloads',
            'download.autoDownload': false,
            'download.minSeeders': 1
          }
        }
      };

      const { cleanup } = renderWithProviders(
        <SettingsContainer open={true} onClose={jest.fn()} />,
        { mockResponses }
      );

      try {
        await waitFor(() => {
          expect(screen.getByRole('dialog')).toBeInTheDocument();
        });

        // Show advanced settings
        const advancedToggle = screen.getByRole('button', { name: /show advanced/i });
        await user.click(advancedToggle);

        // Click reset button
        const resetButton = screen.getByRole('button', { name: /reset to defaults/i });
        await user.click(resetButton);

        // Confirm reset
        const confirmButton = screen.getByRole('button', { name: /confirm/i });
        await user.click(confirmButton);

        // Settings should be reset
        await waitFor(() => {
          expect(screen.getByDisplayValue('/downloads')).toBeInTheDocument();
        });
      } finally {
        cleanup();
      }
    });
  });

  describe('Settings Integration with App', () => {
    it('should open settings from main app', async () => {
      const user = userEvent.setup();
      const { cleanup } = renderWithProviders(<App />);

      try {
        // Find and click settings button
        const settingsButton = screen.getByLabelText(/settings/i);
        await user.click(settingsButton);

        // Settings dialog should open
        await waitFor(() => {
          expect(screen.getByRole('dialog')).toBeInTheDocument();
        });

        expect(screen.getByText(/configuration/i)).toBeInTheDocument();
      } finally {
        cleanup();
      }
    });

    it('should apply settings changes across the app', async () => {
      const user = userEvent.setup();
      let settingsUpdated = false;
      
      const mockResponses = {
        '/api/config': {
          success: true,
          data: settingsUpdated ? {
            ...mockApiResponses.config.data,
            'download.autoDownload': false
          } : mockApiResponses.config.data
        },
        '/api/config/update': {
          success: true,
          data: { message: 'Settings updated' }
        }
      };

      const { cleanup } = renderWithProviders(<App />, { mockResponses });

      try {
        // Open settings
        const settingsButton = screen.getByLabelText(/settings/i);
        await user.click(settingsButton);

        await waitFor(() => {
          expect(screen.getByRole('dialog')).toBeInTheDocument();
        });

        // Change auto-download setting
        const autoDownloadToggle = screen.getByRole('checkbox', { name: /auto download/i });
        await user.click(autoDownloadToggle);

        // Save settings
        const saveButton = screen.getByRole('button', { name: /save/i });
        await user.click(saveButton);

        settingsUpdated = true;

        // Close settings
        const closeButton = screen.getByLabelText(/close/i);
        await user.click(closeButton);

        // Settings should be applied (this would affect download behavior)
        await waitFor(() => {
          expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        });
      } finally {
        cleanup();
      }
    });
  });

  describe('Settings Persistence', () => {
    it('should persist settings between sessions', async () => {
      const user = userEvent.setup();
      const persistedConfig = {
        ...mockApiResponses.config.data,
        'download.path': '/persisted/path'
      };

      const mockResponses = {
        '/api/config': {
          success: true,
          data: persistedConfig
        }
      };

      const { cleanup } = renderWithProviders(
        <SettingsContainer open={true} onClose={jest.fn()} />,
        { mockResponses }
      );

      try {
        await waitFor(() => {
          expect(screen.getByRole('dialog')).toBeInTheDocument();
        });

        // Verify persisted settings are loaded
        expect(screen.getByDisplayValue('/persisted/path')).toBeInTheDocument();
      } finally {
        cleanup();
      }
    });

    it('should handle settings loading errors', async () => {
      const mockResponses = {
        '/api/config': {
          success: false,
          error: 'Failed to load configuration'
        }
      };

      const { cleanup } = renderWithProviders(
        <SettingsContainer open={true} onClose={jest.fn()} />,
        { mockResponses }
      );

      try {
        await waitFor(() => {
          expect(screen.getByText(/failed to load configuration/i)).toBeInTheDocument();
        });

        // Should show retry option
        expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
      } finally {
        cleanup();
      }
    });
  });
});