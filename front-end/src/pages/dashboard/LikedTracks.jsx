import { useEffect, useState } from "react";
import { FiHeart, FiMusic, FiMoreHorizontal, FiPlay } from "react-icons/fi";
import { getLikedSongs } from "../../features/spotify/Services/spotifyService";
import useSpotifyPlayer from "../../features/spotify/hooks/useSpotifyPlayer";

const LikedTracks = () => {
  const [tracks, setTracks] = useState([]);
  const { playTrack } = useSpotifyPlayer();

  useEffect(() => {
    const fetchLikedTracks = async () => {
      try {
        const data = await getLikedSongs();
        setTracks(data.cleanedTracks || []);
      } catch (error) {
        console.error("Failed to fetch liked tracks:", error.message);
      }
    };

    fetchLikedTracks();
  }, []);

  const formatDuration = (ms) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const handlePlayTrack = (trackUri) => {
    playTrack(trackUri);
  };

  return (
    <div className="bg-gradient-to-b from-purple-900 via-black to-black text-white min-h-screen p-4 md:p-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-center md:items-end gap-6 mb-8">
        <div className="w-40 h-40 md:w-48 md:h-48 bg-purple-700 shadow-lg flex items-center justify-center text-white">
          <FiHeart className="text-6xl" />
        </div>
        <div className="text-center md:text-left">
          <p className="text-xs uppercase tracking-wider text-gray-300 mb-1">
            Playlist
          </p>
          <h1 className="text-3xl md:text-5xl font-bold mb-2">Liked Songs</h1>
          <p className="text-gray-300 text-sm md:text-base">
            Your liked tracks from Spotify
          </p>
          <div className="flex justify-center md:justify-start items-center mt-2 text-sm gap-1 text-gray-400">
            <span className="font-bold text-white">You</span>
            <span>•</span>
            <span>{tracks.length} songs</span>
          </div>
        </div>
      </div>

      {/* Tracks List */}
      <div className="mt-8">
        {tracks.map((track) => (
          <div
            key={track.id}
            className="flex items-center justify-between p-4 hover:bg-gray-800 rounded-lg transition-colors"
          >
            <div className="flex items-center space-x-4">
              <button
                onClick={() => handlePlayTrack(track.uri)}
                className="p-2 hover:bg-gray-700 rounded-full transition-colors"
              >
                <FiPlay className="text-xl" />
              </button>
              <img
                src={track.album?.images[0]?.url}
                alt={track.name}
                className="w-12 h-12 rounded"
              />
              <div>
                <h3 className="font-medium">{track.name}</h3>
                <p className="text-sm text-gray-400">
                  {track.artists.map((artist) => artist.name).join(", ")}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-400">
                {formatDuration(track.duration_ms)}
              </span>
              <button className="p-2 hover:bg-gray-700 rounded-full transition-colors">
                <FiMoreHorizontal />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default LikedTracks;
