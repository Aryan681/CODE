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
  const token = localStorage.getItem('spotifyAccessToken');

  const { player, currentTrack, isPlaying, error } = useSpotifyPlayer(token);

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
    isPlayerReady
  };

  return (
    <SpotifyPlayerContext.Provider value={value}>
      {children}
    </SpotifyPlayerContext.Provider>
  );
}; 