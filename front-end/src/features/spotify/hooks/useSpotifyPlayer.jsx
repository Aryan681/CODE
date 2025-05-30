import { useEffect, useState, useRef } from 'react';
import { getValidToken } from '../Services/spotifyService';

// Global player instance and state
let globalPlayerInstance = null;
let isInitialized = false;
let globalDeviceId = localStorage.getItem("spotifyDeviceId");

// Define the callback globally
if (!window.onSpotifyWebPlaybackSDKReady) {
  window.onSpotifyWebPlaybackSDKReady = () => {};
}

export default function useSpotifyPlayer(token) {
  const [player, setPlayer] = useState(globalPlayerInstance);
  const [deviceId, setDeviceId] = useState(globalDeviceId);
  const [currentTrack, setCurrentTrack] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState(null);
  const [isReady, setIsReady] = useState(false);

  // Function to activate device
  const activateDevice = async (device_id, accessToken) => {
    try {
      // Skip activation if we already have this device ID
      if (globalDeviceId === device_id) {
        console.log("Device already activated, skipping activation");
        return true;
      }

      console.log("Activating device:", device_id);
      const response = await fetch("https://api.spotify.com/v1/me/player", {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          device_ids: [device_id],
          play: false,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || "Failed to transfer playback");
      }
      console.log("✅ Device Activated Successfully!");
      globalDeviceId = device_id;
      localStorage.setItem("spotifyDeviceId", device_id);
      return true;
    } catch (err) {
      console.error("❌ Error activating device:", err);
      setError(err.message);
      return false;
    }
  };

  useEffect(() => {
    const initializePlayer = async () => {
      // Prevent multiple initializations
      if (isInitialized && globalPlayerInstance) {
        console.log("Player already initialized, reusing instance");
        setPlayer(globalPlayerInstance);
        setDeviceId(globalDeviceId);
        setIsReady(true);
        return;
      }

      if (!token) {
        console.log("No token available for Spotify player initialization");
        return;
      }

      try {
        // Get a valid token
        const validToken = await getValidToken();
        if (!validToken) {
          throw new Error("Failed to get valid token");
        }

        // Check if script is already loaded
        if (!document.querySelector('script[src="https://sdk.scdn.co/spotify-player.js"]')) {
          const script = document.createElement("script");
          script.src = "https://sdk.scdn.co/spotify-player.js";
          script.async = true;
          document.body.appendChild(script);
        }

        // Wait for SDK to be ready
        await new Promise((resolve) => {
          if (window.Spotify) {
            resolve();
          } else {
            window.onSpotifyWebPlaybackSDKReady = resolve;
          }
        });

        // Create player instance
        const playerInstance = new window.Spotify.Player({
          name: "Eco Web Player",
          getOAuthToken: cb => cb(validToken),
          volume: 0.3,
        });

        // Set up error listeners
        playerInstance.addListener("initialization_error", ({ message }) => {
          console.error("Initialization Error:", message);
          setError(message);
          setIsReady(false);
        });
        
        playerInstance.addListener("authentication_error", async ({ message }) => {
          console.error("Authentication Error:", message);
          setError(message);
          setIsReady(false);
          try {
            const newToken = await getValidToken();
            if (newToken) {
              playerInstance.disconnect();
              globalPlayerInstance = null;
              isInitialized = false;
              initializePlayer();
            }
          } catch (err) {
            console.error("Failed to refresh token:", err);
          }
        });
        
        playerInstance.addListener("account_error", ({ message }) => {
          console.error("Account Error:", message);
          setError(message);
          setIsReady(false);
        });
        
        playerInstance.addListener("playback_error", ({ message }) => {
          console.error("Playback Error:", message);
          setError(message);
        });

        // Set up ready listener
        playerInstance.addListener("ready", async ({ device_id }) => {
          console.log("Player Ready with Device ID:", device_id);
          globalDeviceId = device_id;
          setDeviceId(device_id);
          localStorage.setItem("spotifyDeviceId", device_id);
          setError(null);
          setIsReady(true);

          // Activate the device
          await activateDevice(device_id, validToken);
        });

        playerInstance.addListener("not_ready", ({ device_id }) => {
          console.log("Device ID has gone offline:", device_id);
          localStorage.removeItem("spotifyDeviceId");
          globalDeviceId = null;
          setDeviceId(null);
          setIsReady(false);
        });

        playerInstance.addListener("player_state_changed", state => {
          if (!state) return;
          setCurrentTrack(state.track_window.current_track);
          setIsPlaying(!state.paused);
        });

        // Connect the player
        const connected = await playerInstance.connect();
        if (!connected) {
          throw new Error("Failed to connect to Spotify");
        }

        globalPlayerInstance = playerInstance;
        setPlayer(playerInstance);
        isInitialized = true;
        console.log("✅ Spotify Player Initialized Successfully!");

      } catch (err) {
        console.error("Failed to initialize Spotify player:", err);
        setError(err.message);
        isInitialized = false;
        globalPlayerInstance = null;
        setIsReady(false);
      }
    };

    initializePlayer();

    // Only disconnect when the window is closed
    const handleBeforeUnload = () => {
      if (globalPlayerInstance) {
        console.log("Disconnecting Spotify player on window close");
        globalPlayerInstance.disconnect();
        globalPlayerInstance = null;
        isInitialized = false;
        globalDeviceId = null;
        localStorage.removeItem("spotifyDeviceId");
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []); // Remove token from dependencies

  return { player, deviceId, currentTrack, isPlaying, error, isReady };
}