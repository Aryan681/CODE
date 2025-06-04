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
  const [currentPlaylistId, setCurrentPlaylistId] = useState(null);
  const [originalTracks, setOriginalTracks] = useState([]); // Store original tracks for queue management
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
      const newShuffleState = !isShuffled;
      const response = await fetch(`https://api.spotify.com/v1/me/player/shuffle?state=${newShuffleState}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        setIsShuffled(newShuffleState);
        // If we have tracks in the queue, reorder them based on new shuffle state
        if (queue.length > 0) {
          if (newShuffleState) {
            // Shuffle the current queue
            const shuffledQueue = [...queue].sort(() => Math.random() - 0.5);
            setQueue(shuffledQueue);
          } else {
            // Sort queue back to original order based on track URIs
            const sortedQueue = [...queue].sort((a, b) => {
              const aIndex = tracks.findIndex(t => t.uri === a.uri);
              const bIndex = tracks.findIndex(t => t.uri === b.uri);
              return aIndex - bIndex;
            });
            setQueue(sortedQueue);
          }
        }
      } else {
        throw new Error('Failed to toggle shuffle');
      }
    } catch (error) {
      console.error('Failed to toggle shuffle:', error);
    }
  };

  const playPlaylist = async (playlistId, tracks, startWithRandom = false) => {
    if (!deviceId || !token) return;
  
    try {
      clearQueue();
      setCurrentPlaylistId(playlistId);
      setOriginalTracks(tracks);
  
      const tracksWithContext = tracks.map(track => ({
        ...track,
        playlistContext: playlistId
      }));
  
      let firstTrackToPlay;
  
      if (isShuffled) {
        const shuffledTracks = [...tracksWithContext].sort(() => Math.random() - 0.5);
        addToQueue(shuffledTracks);
        firstTrackToPlay = shuffledTracks[0];
  
        await fetch(`https://api.spotify.com/v1/me/player/shuffle?state=true`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
      } else {
        addToQueue(tracksWithContext);
        firstTrackToPlay = tracksWithContext[0];
  
        await fetch(`https://api.spotify.com/v1/me/player/shuffle?state=false`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
      }
  
      const response = await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          uris: [firstTrackToPlay.uri]
        })
      });
  
      if (!response.ok) {
        throw new Error('Failed to play playlist');
      }
  
      setCurrentQueueIndex(0);
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

  const playTrack = async (trackUri, playlistId = null) => {
    if (!deviceId || !token) return;
    try {
      // Don't clear the queue, just update the current playlist ID
      setCurrentPlaylistId(playlistId);

      // Start playing the selected track
      const response = await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          uris: [trackUri]
        })
      });

      if (!response.ok) {
        throw new Error('Failed to play track');
      }

      // Find the track in the queue and set its index
      const trackIndex = queue.findIndex(track => track.uri === trackUri);
      setCurrentQueueIndex(trackIndex);
    } catch (error) {
      console.error('Failed to play track:', error);
    }
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
      } else if (originalTracks.length > 0) {
        // If we're at the end of the queue, add more tracks
        const remainingTracks = originalTracks.slice(queue.length);
        if (remainingTracks.length > 0) {
          const tracksToAdd = isShuffled 
            ? [...remainingTracks].sort(() => Math.random() - 0.5)
            : remainingTracks;
          
          // Add tracks with playlist context
          const tracksWithContext = tracksToAdd.map(track => ({
            ...track,
            playlistContext: currentPlaylistId
          }));
          
          addToQueue(tracksWithContext);
          
          // Play the first track from the newly added tracks
          const nextTrack = tracksWithContext[0];
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
          setCurrentQueueIndex(queue.length);
        }
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

  // Add new tracks to queue when current track changes
  useEffect(() => {
    if (currentTrack && originalTracks.length > 0) {
      const currentIndex = originalTracks.findIndex(track => track.id === currentTrack.id);
      
      if (currentIndex !== -1) {
        // If we're near the end of the queue, add more tracks
        if (queue.length - currentQueueIndex <= 3) {
          const remainingTracks = originalTracks.slice(currentIndex + 1);
          if (remainingTracks.length > 0) {
            const tracksToAdd = isShuffled 
              ? [...remainingTracks].sort(() => Math.random() - 0.5)
              : remainingTracks;
            
            // Add tracks with playlist context
            const tracksWithContext = tracksToAdd.map(track => ({
              ...track,
              playlistContext: currentPlaylistId
            }));
            
            addToQueue(tracksWithContext);
          }
        }
      }
    }
  }, [currentTrack, currentQueueIndex, queue.length, originalTracks, isShuffled, currentPlaylistId]);

  // Update currentQueueIndex when currentTrack changes
  useEffect(() => {
    if (currentTrack && queue.length > 0) {
      const index = queue.findIndex(track => 
        track.id === currentTrack.id && 
        track.playlistContext === currentPlaylistId
      );
      if (index !== -1) {
        setCurrentQueueIndex(index);
      }
    }
  }, [currentTrack, queue, currentPlaylistId]);

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
    playTrack,
    isShuffled,
    queue,
    addToQueue,
    clearQueue,
    playNext,
    playPrevious,
    currentQueueIndex,
    currentPlaylistId
  };

  return (
    <SpotifyPlayerContext.Provider value={value}>
      {children}
    </SpotifyPlayerContext.Provider>
  );
}; 


