import axios from "axios";
const API_BASE = "http://localhost:3000/api/spotify";

// Create axios instance with base configuration
const spotifyApi = axios.create({
  baseURL: API_BASE,
  headers: {
    "Content-Type": "application/json",
  },
});

// Add Authorization header dynamically for each request
spotifyApi.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token"); // Get the token from localStorage
    if (token) {
      config.headers["Authorization"] = `Bearer ${token}`; // Add the token to Authorization header
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
spotifyApi.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Handle token expiration or invalid token
      localStorage.removeItem("token");
      window.location.href = "/auth/login";
      console.error("Authentication error:", error);
    }
    return Promise.reject(error);
  }
);

export const initiateSpotifyLogin = async () => {
  try {
    // Send GET request to backend API using the spotifyApi instance
    const response = await spotifyApi.get("/login");

    if (response.data.url) {
      console.log("Redirecting to Spotify login URL:", response.data.url);
      window.location.href = response.data.url; // Redirect to the Spotify login URL
    } else {
      console.error("No URL returned from backend.");
      alert("Failed to initiate Spotify login.");
    }
  } catch (error) {
    console.error("Error initiating Spotify login:", error);
    alert("Failed to initiate Spotify login.");
  }
};

export const handleSpotifyCallback = async (token, refreshToken, expiresIn) => {
  try {
    // Store the tokens in localStorage with proper naming
    localStorage.setItem("spotifyAccessToken", token);
    localStorage.setItem("spotifyRefreshToken", refreshToken);
    localStorage.setItem("spotifyTokenExpiry", Date.now() + expiresIn * 1000);

    // Verify the token by making a test request
    await spotifyApi.get("/profile");
    return true;
  } catch (error) {
    console.error("Error handling Spotify callback:", error);
    return false;
  }
};

export const refreshAccessToken = async () => {
  try {
    const refreshToken = localStorage.getItem("spotifyRefreshToken");
    if (!refreshToken) {
      throw new Error("No refresh token found");
    }

    const response = await spotifyApi.post("/refresh", { refreshToken });
    const { accessToken, expiresIn } = response.data;

    // Update stored tokens
    localStorage.setItem("spotifyAccessToken", accessToken);
    localStorage.setItem("spotifyTokenExpiry", Date.now() + expiresIn * 1000);

    return accessToken;
  } catch (error) {
    console.error("Error refreshing token:", error);
    // Clear tokens on refresh failure
    localStorage.removeItem("spotifyAccessToken");
    localStorage.removeItem("spotifyRefreshToken");
    localStorage.removeItem("spotifyTokenExpiry");
    localStorage.removeItem("spotify_connected");
    throw error;
  }
};

export const isTokenValid = () => {
  const expiry = localStorage.getItem("spotifyTokenExpiry");
  if (!expiry) return false;
  return Date.now() < parseInt(expiry);
};

export const getValidToken = async () => {
  if (!isTokenValid()) {
    return await refreshAccessToken();
  }
  return localStorage.getItem("spotifyAccessToken");
};

export const getSpotifyProfile = async () => {
  try {
    const response = await spotifyApi.get("/profile");
    return response.data;
  } catch (error) {
    console.error("Error getting Spotify profile:", error);
    throw error;
  }
};

export const getUserPlaylists = async () => {
  try {
    const response = await spotifyApi.get("/playlists");
    return response.data.playlists;
  } catch (error) {
    console.error("Error getting user playlists:", error);
    throw error;
  }
};

export const getLikedSongs = async (limit = 50, offset = 0) => {
  try {
    const response = await spotifyApi.get("/liked", {
      params: { limit, offset },
    });
    return response.data;
  } catch (error) {
    console.error("Error getting liked songs:", error);
    throw error;
  }
};

export const getPlaylistTracks = async (playlistId) => {
  try {
    const response = await spotifyApi.get(`/playlists/${playlistId}/tracks`);
    return response.data.tracks;
  } catch (error) {
    console.error("❌ Error getting playlist tracks:", error);

    if (error.response?.status === 401) {
      throw new Error("Spotify session expired. Please reconnect.");
    }

    throw new Error(
      error.response?.data?.message || "Failed to fetch playlist tracks"
    );
  }
};

export const setVolume = async (volume) => {
  const response = await fetch("http://localhost:3000/api/spotify/volume", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      // Send access token as cookie or already managed by your auth middleware
    },
    credentials: "include", // if you're using cookies for auth
    body: JSON.stringify({ volume }),
  });

  if (!response.ok) {
    throw new Error("Failed to set volume");
  }
};

export const getCurrentPlaybackState = async () => {
  const response = await fetch("http://localhost:3000/api/spotify/player", {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include", // again if using cookies/session
  });

  if (!response.ok) {
    throw new Error("Failed to get playback state");
  }

  return response.json();
};

export const playTrack = async (trackUri, deviceId, position = 0) => {
  try {
    if (!deviceId) {
      throw new Error("Device ID is required");
    }
    await spotifyApi.post("/play", { 
      trackUri, 
      deviceId,
      position_ms: position 
    });
  } catch (error) {
    console.error("Error playing track:", error);
    throw error;
  }
};

export const pauseTrack = async () => {
  try {
    await spotifyApi.put("/pause");
  } catch (error) {
    console.error("Error pausing track:", error);
    throw error;
  }
};

export const resumeTrack = async () => {
  try {
    await spotifyApi.put("/resume");
  } catch (error) {
    console.error("Error resuming track:", error);
    throw error;
  }
};

export const skipTrack = async (direction = "next") => {
  try {
    await spotifyApi.post("/track", { action: direction });
  } catch (error) {
    console.error("Error skipping track:", error);
    throw error;
  }
};

export const likeTrack = async (trackId) => {
  try {
    await spotifyApi.post("/like", { trackId });
  } catch (error) {
    console.error("Error liking track:", error);
    throw error;
  }
};

export const unlikeTrack = async (trackId) => {
  try {
    await spotifyApi.post("/unlike", { trackId });
  } catch (error) {
    console.error("Error unliking track:", error);
    throw error;
  }
};

export const addToPlaylist = async (playlistId, trackUri) => {
  try {
    await spotifyApi.post("/playlist/add", { playlistId, trackUri });
  } catch (error) {
    console.error("Error adding to playlist:", error);
    throw error;
  }
};

export const removeFromPlaylist = async (playlistId, trackUri) => {
  try {
    await spotifyApi.post("/playlist/remove", { playlistId, trackUri });
  } catch (error) {
    console.error("Error removing from playlist:", error);
    throw error;
  }
};

export const isTrackLiked = async (trackId) => {
  try {
    const response = await spotifyApi.get("/is-liked", {
      params: { trackId },
    });
    return response.data.liked;
  } catch (error) {
    console.error("Error checking track like status:", error);
    throw error;
  }
};
