import React, { createContext, useContext, useState, useEffect } from 'react';
import useSpotifyPlayer from '../hooks/useSpotifyPlayer';

const SpotifyPlayerContext = createContext();

export const useSpotifyPlayerContext = () => {
  const context = useContext(SpotifyPlayerContext);
  if (!context) {
    throw new Error('useSpotifyPlayerContext must be used within a SpotifyPlayerProvider');
  }
  return context;
};

export const SpotifyPlayerProvider = ({ children }) => {
  const [deviceId, setDeviceId] = useState(localStorage.getItem('spotifyDeviceId'));
  const [isPlayerReady, setIsPlayerReady] = useState(false);
  const [isShuffled, setIsShuffled] = useState(false);
  const [queue, setQueue] = useState([]);
  const [currentQueueIndex, setCurrentQueueIndex] = useState(-1);
  const token = localStorage.getItem('spotifyAccessToken');

  const { player, currentTrack, isPlaying, error } = useSpotifyPlayer(token);

  const togglePlayPause = async () => {
    if (!player) return;
    try {
      await player.togglePlay();
    } catch (error) {
      console.error('Failed to toggle play/pause:', error);
    }
  };

  const toggleShuffle = async () => {
    if (!deviceId || !token) return;
    try {
      const response = await fetch(`https://api.spotify.com/v1/me/player/shuffle?state=${!isShuffled}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        setIsShuffled(!isShuffled);
      } else {
        throw new Error('Failed to toggle shuffle');
      }
    } catch (error) {
      console.error('Failed to toggle shuffle:', error);
    }
  };

  const playPlaylist = async (playlistId, startWithRandom = false) => {
    if (!deviceId || !token) return;
    try {
      // First enable shuffle if requested
      if (startWithRandom) {
        await fetch(`https://api.spotify.com/v1/me/player/shuffle?state=true`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        setIsShuffled(true);
      }

      // Start playing the playlist
      const response = await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          context_uri: `spotify:playlist:${playlistId}`
        })
      });

      if (!response.ok) {
        throw new Error('Failed to play playlist');
      }
    } catch (error) {
      console.error('Failed to play playlist:', error);
    }
  };

  const addToQueue = (tracks) => {
    setQueue(prevQueue => [...prevQueue, ...tracks]);
  };

  const clearQueue = () => {
    setQueue([]);
    setCurrentQueueIndex(-1);
  };

  const playNext = async () => {
    if (!player || queue.length === 0) return;
    
    try {
      const nextIndex = currentQueueIndex + 1;
      if (nextIndex < queue.length) {
        const nextTrack = queue[nextIndex];
        await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            uris: [nextTrack.uri]
          })
        });
        setCurrentQueueIndex(nextIndex);
      }
    } catch (error) {
      console.error('Failed to play next track:', error);
    }
  };

  const playPrevious = async () => {
    if (!player || queue.length === 0) return;
    
    try {
      const prevIndex = currentQueueIndex - 1;
      if (prevIndex >= 0) {
        const prevTrack = queue[prevIndex];
        await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            uris: [prevTrack.uri]
          })
        });
        setCurrentQueueIndex(prevIndex);
      }
    } catch (error) {
      console.error('Failed to play previous track:', error);
    }
  };

  // Update currentQueueIndex when currentTrack changes
  useEffect(() => {
    if (currentTrack && queue.length > 0) {
      const index = queue.findIndex(track => track.id === currentTrack.id);
      if (index !== -1) {
        setCurrentQueueIndex(index);
      }
    }
  }, [currentTrack, queue]);

  useEffect(() => {
    if (player) {
      // Set up ready listener
      player.addListener('ready', ({ device_id }) => {
        console.log('Player Ready with Device ID:', device_id);
        setDeviceId(device_id);
        localStorage.setItem('spotifyDeviceId', device_id);
        setIsPlayerReady(true);
      });

      // Set up not ready listener
      player.addListener('not_ready', ({ device_id }) => {
        console.log('Device ID has gone offline:', device_id);
        setDeviceId(null);
        localStorage.removeItem('spotifyDeviceId');
        setIsPlayerReady(false);
      });

      // Set up error listeners
      player.addListener('initialization_error', ({ message }) => {
        console.error('Failed to initialize:', message);
        setIsPlayerReady(false);
      });

      player.addListener('authentication_error', ({ message }) => {
        console.error('Failed to authenticate:', message);
        setIsPlayerReady(false);
      });

      player.addListener('account_error', ({ message }) => {
        console.error('Failed to validate Spotify account:', message);
        setIsPlayerReady(false);
      });

      // Cleanup listeners on unmount
      return () => {
        player.removeListener('ready');
        player.removeListener('not_ready');
        player.removeListener('initialization_error');
        player.removeListener('authentication_error');
        player.removeListener('account_error');
      };
    }
  }, [player]);

  // Check localStorage for device ID on mount
  useEffect(() => {
    const storedDeviceId = localStorage.getItem('spotifyDeviceId');
    if (storedDeviceId) {
      console.log('Found stored device ID:', storedDeviceId);
      setDeviceId(storedDeviceId);
      setIsPlayerReady(true);
    }
  }, []);

  const value = {
    player,
    deviceId,
    currentTrack,
    isPlaying,
    error,
    isPlayerReady,
    togglePlayPause,
    toggleShuffle,
    playPlaylist,
    isShuffled,
    queue,
    addToQueue,
    clearQueue,
    playNext,
    playPrevious,
    currentQueueIndex
  };

  return (
    <SpotifyPlayerContext.Provider value={value}>
      {children}
    </SpotifyPlayerContext.Provider>
  );
}; 