import { useCallback } from 'react';
import { playTrack, pauseTrack, resumeTrack } from '../../../Services/spotifyService';
import { useSpotifyPlayerContext } from '../../../context/SpotifyPlayerContext';

export const usePlayerHandlers = (player, deviceId, currentTrack, isPlaying, state) => {
  const {
    volume,
    setVolume,
    isMuted,
    setIsMuted,
    previousVolume,
    setPreviousVolume,
    currentPosition,
    setCurrentPosition,
    setIsDragging
  } = state;

  const { playNext, playPrevious } = useSpotifyPlayerContext();

  const handleClose = useCallback(async () => {
    try {
      // Stop playback
      if (player) {
        await player.pause();
      }
      // Clear all track-related data from localStorage
      localStorage.removeItem('spotifyCurrentTrack');
      localStorage.removeItem('spotifyPosition');
      localStorage.removeItem('spotifyIsPlaying');
      localStorage.removeItem('spotifyTrackId');
    } catch (error) {
      console.error('Error closing player:', error);
    }
  }, [player]);

  const handlePlayPause = useCallback(async () => {
    const currentDeviceId = deviceId || localStorage.getItem('spotifyDeviceId');
    if (!currentDeviceId) {
      console.error('No device ID available');
      return;
    }
    
    try {
      if (isPlaying) {
        // Save current position before pausing
        const state = await player.getCurrentState();
        if (state) {
          localStorage.setItem('spotifyPosition', state.position.toString());
        }
        await pauseTrack();
      } else {
        // Get stored volume from localStorage
        const storedVolume = localStorage.getItem('spotifyVolume');
        const volumeToApply = storedVolume ? parseInt(storedVolume) / 100 : 0.5;

        // If we have a saved track but no current track, try to play it
        if (!currentTrack) {
          const savedTrack = localStorage.getItem('spotifyCurrentTrack');
          const savedPosition = localStorage.getItem('spotifyPosition');
          
          if (savedTrack) {
            const track = JSON.parse(savedTrack);
            try {
              // First play the track
              await playTrack(track.uri, currentDeviceId);
              // Then set the stored volume
              if (player) {
                await player.setVolume(volumeToApply);
              }
              // Then seek to the saved position
              if (savedPosition) {
                await player.seek(parseInt(savedPosition));
              }
            } catch (error) {
              console.error('Error playing saved track:', error);
            }
            return;
          }
        } else {
          // For existing track, first play then seek to saved position
          const savedPosition = localStorage.getItem('spotifyPosition');
          
          try {
            // First play the track
            await playTrack(currentTrack.uri, currentDeviceId);
            // Then set the stored volume
            if (player) {
              await player.setVolume(volumeToApply);
            }
            // Then seek to the saved position
            if (savedPosition) {
              await player.seek(parseInt(savedPosition));
            }
          } catch (error) {
            console.error('Error playing track:', error);
          }
        }
      }
    } catch (err) {
      console.error('Error toggling playback:', err);
    }
  }, [player, deviceId, currentTrack, isPlaying]);

  const handleSkip = useCallback(async (direction) => {
    if (!player) return;
    try {
      if (direction === 'next') {
        await playNext();
      } else {
        await playPrevious();
      }
    } catch (err) {
      console.error('Error skipping track:', err);
    }
  }, [player, playNext, playPrevious]);

  // Helper function for logarithmic volume scaling
  const logarithmicScale = (value) => {
    // Convert linear 0-100 to logarithmic scale
    // This provides better human perception of volume changes
    return Math.pow(value / 100, 2) * 100;
  };

  // Helper function for inverse logarithmic scaling
  const inverseLogarithmicScale = (value) => {
    // Convert logarithmic scale back to linear 0-100
    return Math.sqrt(value / 100) * 100;
  };

  const handleVolumeChange = useCallback(async (e) => {
    const newVolume = parseInt(e.target.value);
    setVolume(newVolume);
    localStorage.setItem('spotifyVolume', newVolume.toString());
    
    if (player) {
      try {
        await player.setVolume(newVolume / 100);
      } catch (error) {
        console.error('Error setting volume:', error);
      }
    }
  }, [player, setVolume]);

  const handleMuteToggle = useCallback(async () => {
    if (isMuted) {
      // When unmuting, restore previous volume from localStorage
      const storedVolume = localStorage.getItem('spotifyVolume');
      const volumeToApply = storedVolume ? parseInt(storedVolume) : previousVolume;
      
      setVolume(volumeToApply);
      localStorage.setItem('spotifyVolume', volumeToApply.toString());
      
      if (player) {
        try {
          await player.setVolume(volumeToApply / 100);
        } catch (error) {
          console.error('Error unmuting:', error);
        }
      }
    } else {
      // When muting, save current volume and set to 0
      setPreviousVolume(volume);
      setVolume(0);
      localStorage.setItem('spotifyVolume', '0');
      
      if (player) {
        try {
          await player.setVolume(0);
        } catch (error) {
          console.error('Error muting:', error);
        }
      }
    }
    setIsMuted(!isMuted);
    localStorage.setItem('spotifyMuteState', (!isMuted).toString());
  }, [player, volume, isMuted, previousVolume, setVolume, setPreviousVolume, setIsMuted]);

  const handleSeek = useCallback(async (e) => {
    if (!player || !deviceId) return;
    
    const seekPosition = parseInt(e.target.value);
    setCurrentPosition(seekPosition);
    localStorage.setItem('spotifyPosition', seekPosition.toString());
    
    try {
      await player.seek(seekPosition);
    } catch (error) {
      console.error('Error seeking track:', error);
    }
  }, [player, deviceId, setCurrentPosition]);

  const formatTime = useCallback((ms) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }, []);

  return {
    handlePlayPause,
    handleSkip,
    handleVolumeChange,
    handleMuteToggle,
    handleSeek,
    formatTime,
    handleClose
  };
}; 