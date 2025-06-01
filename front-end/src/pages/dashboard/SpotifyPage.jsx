import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { getSpotifyProfile, isTokenValid, getValidToken } from "../../features/spotify/Services/spotifyService";
import ConnectSpotify from "../../features/spotify/component/ConnectSpotify";
import SpotifyProfile from "../../features/spotify/component/SpotifyProfile";
import SpotifyLoader from "../../features/spotify/component/common/SpotifyLoader";
import useSpotifyPlayer from "../../features/spotify/hooks/useSpotifyPlayer";
import "../../features/spotify/Spotify.css";

function SpotifyPage() {
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const location = useLocation();
  const token = localStorage.getItem("spotifyAccessToken");
  const { player, deviceId, currentTrack, isPlaying, error } = useSpotifyPlayer(token);

  // Handle token from query string
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const token = params.get("token");
    const refreshToken = params.get("refreshToken");
    const expiresIn = params.get("expiresIn");

    if (token && refreshToken && expiresIn) {
      localStorage.setItem("spotifyAccessToken", token);
      localStorage.setItem("spotifyRefreshToken", refreshToken);
      localStorage.setItem("spotifyTokenExpiry", Date.now() + parseInt(expiresIn) * 1000);
      localStorage.setItem("spotify_connected", "true");

      // Clean up the URL
      window.history.replaceState({}, document.title, location.pathname);
    }
  }, [location]);

  // Check connection and try profile
  useEffect(() => {
    const checkConnection = async () => {
      try {
        setLoading(true);
        
        // Check if we have a valid token
        if (!isTokenValid()) {
          // Try to refresh the token
          try {
            await getValidToken();
          } catch (error) {
            console.log("Token refresh failed:", error);
            setIsConnected(false);
            localStorage.setItem("spotify_connected", "false");
            setLoading(false);
            return;
          }
        }

        // Verify connection by getting profile
        await getSpotifyProfile();
        setIsConnected(true);
        localStorage.setItem("spotify_connected", "true");
      } catch (error) {
        console.log("Not connected to Spotify:", error);
        setIsConnected(false);
        localStorage.setItem("spotify_connected", "false");
      } finally {
        setLoading(false);
      }
    };

    checkConnection();
  }, []);

  if (loading) {
    return <SpotifyLoader message="Connecting to Spotify" />;
  }

  if (!isConnected) {
    return <ConnectSpotify />;
  }

  return (
    <div className="spotify-page">
      <SpotifyProfile />
      {error && <div className="error-message">{error}</div>}
    </div>
  );
}

export default SpotifyPage;
