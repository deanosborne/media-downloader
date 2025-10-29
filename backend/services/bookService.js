import axios from 'axios';

// Google Books API (no key required for basic searches)
export const searchBooks = async (query) => {
  try {
    const response = await axios.get('https://www.googleapis.com/books/v1/volumes', {
      params: {
        q: query,
        maxResults: 10,
        printType: 'books',
        langRestrict: 'en'
      }
    });

    if (!response.data.items) return [];

    return response.data.items.map(item => ({
      id: item.id,
      name: item.volumeInfo.title,
      year: item.volumeInfo.publishedDate ? new Date(item.volumeInfo.publishedDate).getFullYear() : null,
      overview: item.volumeInfo.description || 'No description available',
      poster: item.volumeInfo.imageLinks?.thumbnail || null,
      authors: item.volumeInfo.authors?.join(', ') || 'Unknown'
    }));
  } catch (error) {
    console.error('Book search error:', error.message);
    return [];
  }
};

// Audible/Audiobook search using iTunes API
export const searchAudiobooks = async (query) => {
  try {
    const response = await axios.get('https://itunes.apple.com/search', {
      params: {
        term: query,
        media: 'audiobook',
        limit: 10,
        entity: 'audiobook'
      }
    });

    if (!response.data.results) return [];

    return response.data.results.map(item => ({
      id: item.collectionId,
      name: item.collectionName,
      year: item.releaseDate ? new Date(item.releaseDate).getFullYear() : null,
      overview: item.description || `By ${item.artistName}`,
      poster: item.artworkUrl100 || null,
      authors: item.artistName
    }));
  } catch (error) {
    console.error('Audiobook search error:', error.message);
    return [];
  }
};

// Application search (using a simple approach - can be enhanced)
export const searchApplications = async (query) => {
  try {
    // Search across multiple platforms
    const results = [];

    // Windows Store / Microsoft Store API
    // Note: This is a simplified version - you might want to add proper API integration
    const windowsApps = [
      { name: 'Visual Studio Code', type: 'Development' },
      { name: 'Slack', type: 'Communication' },
      { name: 'Discord', type: 'Communication' },
      { name: 'Spotify', type: 'Music' },
      { name: 'VLC Media Player', type: 'Media' },
      { name: 'OBS Studio', type: 'Streaming' },
      { name: 'Steam', type: 'Gaming' },
      { name: 'Epic Games', type: 'Gaming' },
      { name: 'Adobe Photoshop', type: 'Creative' },
      { name: 'Audacity', type: 'Audio' },
      { name: 'Blender', type: '3D Modeling' },
      { name: 'FileZilla', type: 'FTP' },
      { name: 'WinRAR', type: 'Compression' },
      { name: '7-Zip', type: 'Compression' },
      { name: 'Chrome', type: 'Browser' },
      { name: 'Firefox', type: 'Browser' }
    ];

    const filtered = windowsApps.filter(app => 
      app.name.toLowerCase().includes(query.toLowerCase())
    );

    return filtered.map((app, idx) => ({
      id: `app_${idx}`,
      name: app.name,
      year: null,
      overview: `${app.type} Application`,
      poster: null
    }));
  } catch (error) {
    console.error('Application search error:', error.message);
    return [];
  }
};
