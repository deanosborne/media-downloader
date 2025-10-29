# Media Downloader

A full-stack web application for automating media downloads with torrent search, Real-Debrid integration, and Plex automation.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node](https://img.shields.io/badge/node-%3E%3D16.0.0-green.svg)
![React](https://img.shields.io/badge/react-18.2.0-blue.svg)

## Features

- 🔍 **Smart Search**: Autocomplete suggestions using TMDB API for movies and TV shows
- 📥 **Automated Downloads**: Torrent search via Jackett with automatic downloading
- ⚡ **Real-Debrid Integration**: Premium download speeds and cached torrents
- 📺 **Plex Automation**: Automatic file organization and library updates
- 📊 **Queue Management**: Track download status with real-time progress updates
- 🎬 **Multi-Media Support**: Movies, TV shows, books, audiobooks, and applications
- ⚙️ **Configurable**: Flexible configuration for directories and services

## Tech Stack

### Frontend

- React 18
- Material-UI (MUI)
- Axios

### Backend

- Node.js + Express
- SQLite3
- Axios
- Chokidar (file watching)

### External Services

- TMDB API (metadata)
- Jackett (torrent indexing)
- Real-Debrid (premium downloading)
- Plex Media Server

## Prerequisites

- Node.js >= 16.0.0
- npm or yarn
- [Jackett](https://github.com/Jackett/Jackett) installed and running
- [Real-Debrid](https://real-debrid.com) premium account
- [Plex Media Server](https://www.plex.tv) installed
- [TMDB API Key](https://www.themoviedb.org/settings/api)

## Installation

### 1. Clone the repository


git clone [https://github.com/yourusername/media-downloader.git](https://github.com/yourusername/media-downloader.git)

cd media-downloader


### 2. Backend Setup


cd backend

npm install

cp .env.example .env

Edit `backend/.env` with your configuration:

```
PORT=5000
TMDB API (get from https://www.themoviedb.org/settings/api)

TMDB_API_KEY=your_tmdb_api_key_here
Jackett (install from https://github.com/Jackett/Jackett)

JACKETT_URL=http://localhost:9117
JACKETT_API_KEY=your_jackett_api_key
Real-Debrid (get from https://real-debrid.com/apitoken)

REAL_DEBRID_API_KEY=your_real_debrid_api_key
Plex (get token from https://support.plex.tv/articles/204059436)

PLEX_URL=http://localhost:32400
PLEX_TOKEN=your_plex_token
Paths (customize to your setup)

DOWNLOAD_PATH=/path/to/downloads
PLEX_MOVIE_PATH=/path/to/plex/Movies
PLEX_TV_PATH=/path/to/plex/TV Shows
PLEX_BOOKS_PATH=/path/to/plex/Books
PLEX_AUDIOBOOKS_PATH=/path/to/plex/Audiobooks
```


### 3. Frontend Setup


cd ../frontend

npm install


### 4. Run the Application

#### Development Mode

```
Terminal 1 - Backend

cd backend
npm run dev
Terminal 2 - Frontend

cd frontend
npm start
```



The application will be available at `http://localhost:3000`

#### Production Mode

```
Build frontend

cd frontend
npm run build
Serve with backend

cd ../backend
npm start
```


## Usage

1. **Select Media Type**: Choose from Movie, TV Show, Book, Audiobook, or Application
2. **Search**: Start typing to see autocomplete suggestions
3. **Add to Queue**: Select an item and click "Add to Queue"
4. **Start Download**: Click the play button to initiate the download
5. **Monitor Progress**: Watch real-time progress updates
6. **Auto-Organization**: Files automatically move to Plex libraries when complete

## API Endpoints

### Search

GET /api/search?query=inception&type=Movie


### Queue Management


GET    /api/queue           # Get all queue items

POST   /api/queue           # Add item to queue

POST   /api/queue/:id/start # Start download

DELETE /api/queue/:id       # Remove item


### Configuration


## File Organization

The app automatically organizes files according to Plex naming conventions:

- **Movies**: `/Movies/Movie Name (Year)/Movie Name (Year).ext`
- **TV Shows**: `/TV Shows/Show Name/Season 01/Show Name - S01E01.ext`
- **Books**: `/Books/Book Name.ext`
- **Audiobooks**: `/Audiobooks/Book Name/Book Name.ext`

## Troubleshooting

### Downloads not starting

- Check Jackett is running and API key is correct
- Verify Real-Debrid API key is valid
- Check backend logs for errors

### Files not moving to Plex

- Verify Plex paths in `.env` are correct
- Check folder permissions
- Ensure Plex token is valid

### No search suggestions

- Verify TMDB API key is valid
- Check internet connection
- Review backend logs

## Docker Support (Optional)

docker-compose up -d


## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## Roadmap

- [X] Quality selection for torrents
- [ ] Subtitle downloading
- [ ] Multiple language support
- [ ] Email/push notifications
- [ ] Scheduling downloads
- [ ] Better TV show season/episode handling
- [ ] Sonarr/Radarr integration
- [ ] User authentication (multi-user)

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Disclaimer

This software is for educational purposes only. Users are responsible for complying with their local laws regarding downloading and sharing copyrighted content.

## Acknowledgments

- [TMDB](https://www.themoviedb.org) for metadata API
- [Jackett](https://github.com/Jackett/Jackett) for torrent indexing
- [Real-Debrid](https://real-debrid.com) for premium downloading
- [Plex](https://www.plex.tv) for media server
- [Material-UI](https://mui.com) for UI components
