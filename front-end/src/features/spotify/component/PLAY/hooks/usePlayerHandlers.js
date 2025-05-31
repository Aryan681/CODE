import { useCallback } from 'react';
import { playTrack, pauseTrack, resumeTrack, skipTrack } from '../../../Services/spotifyService';

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
        // If we have a saved track but no current track, try to play it
        if (!currentTrack) {
          const savedTrack = localStorage.getItem('spotifyCurrentTrack');
          const savedPosition = localStorage.getItem('spotifyPosition');
          if (savedTrack) {
            const track = JSON.parse(savedTrack);
            try {
              // First seek to the saved position
              if (savedPosition) {
                await player.seek(parseInt(savedPosition));
              }
              // Then play the track
              await playTrack(track.uri, currentDeviceId);
            } catch (error) {
              console.error('Error playing saved track:', error);
            }
            return;
          }
        } else {
          // For existing track, first seek to saved position then resume
          const savedPosition = localStorage.getItem('spotifyPosition');
          if (savedPosition) {
            try {
              await player.seek(parseInt(savedPosition));
            } catch (error) {
              console.error('Error seeking to position:', error);
            }
          }
          await resumeTrack();
        }
      }
    } catch (err) {
      console.error('Error toggling playback:', err);
    }
  }, [player, deviceId, currentTrack, isPlaying]);

  const handleSkip = useCallback(async (direction) => {
    if (!deviceId) return;
    try {
      await skipTrack(direction);
    } catch (err) {
      console.error('Error skipping track:', err);
    }
  }, [deviceId]);

  const handleVolumeChange = useCallback(async (e) => {
    const newVolume = parseInt(e.target.value);
    setVolume(newVolume);
    localStorage.setItem('spotifyVolume', newVolume.toString());
    if (player) {
      await player.setVolume(newVolume / 100);
    }
  }, [player, setVolume]);

  const handleMuteToggle = useCallback(async () => {
    if (isMuted) {
      setVolume(previousVolume);
      localStorage.setItem('spotifyVolume', previousVolume.toString());
      if (player) {
        await player.setVolume(previousVolume / 100);
      }
    } else {
      setPreviousVolume(volume);
      setVolume(0);
      localStorage.setItem('spotifyVolume', '0');
      if (player) {
        await player.setVolume(0);
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
    formatTime
  };
}; 