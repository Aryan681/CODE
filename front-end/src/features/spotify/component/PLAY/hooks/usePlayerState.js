import { useState, useEffect } from 'react';

export const usePlayerState = (player, isPlaying) => {
  const [volume, setVolume] = useState(() => {
    const savedVolume = localStorage.getItem('spotifyVolume');
    return savedVolume ? parseInt(savedVolume) : 50;
  });
  const [isMuted, setIsMuted] = useState(() => {
    const savedMuteState = localStorage.getItem('spotifyMuteState');
    return savedMuteState === 'true';
  });
  const [previousVolume, setPreviousVolume] = useState(volume);
  const [currentPosition, setCurrentPosition] = useState(() => {
    const savedPosition = localStorage.getItem('spotifyPosition');
    return savedPosition ? parseInt(savedPosition) : 0;
  });
  const [duration, setDuration] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  // Apply saved volume when player is ready or when track changes
  useEffect(() => {
    if (player) {
      const applyVolume = async () => {
        try {
          const savedVolume = localStorage.getItem('spotifyVolume');
          const volumeToApply = savedVolume ? parseInt(savedVolume) / 100 : 0.5;
          await player.setVolume(volumeToApply);
          // Update state to match the applied volume
          setVolume(parseInt(savedVolume) || 50);
        } catch (error) {
          console.error('Error applying volume:', error);
        }
      };
      applyVolume();
    }
  }, [player, isPlaying]); // Re-apply volume when track changes

  // Track playback position and duration
  useEffect(() => {
    let interval;
    if (player && isPlaying) {
      interval = setInterval(async () => {
        try {
          const state = await player.getCurrentState();
          if (state) {
            const position = state.position;
            const trackDuration = state.duration;
            setCurrentPosition(position);
            setDuration(trackDuration);
            // Only update localStorage if we're not dragging
            if (!isDragging) {
              localStorage.setItem('spotifyPosition', position.toString());
            }
            localStorage.setItem('spotifyTrackId', state.track_window.current_track.id);
          }
        } catch (error) {
          console.error('Error getting playback state:', error);
        }
      }, 1000);
    }
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [player, isPlaying, isDragging]);

  return {
    volume,
    setVolume,
    isMuted,
    setIsMuted,
    previousVolume,
    setPreviousVolume,
    currentPosition,
    setCurrentPosition,
    duration,
    setDuration,
    isDragging,
    setIsDragging
  };
}; 