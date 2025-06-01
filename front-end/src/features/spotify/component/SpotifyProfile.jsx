import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  getUserPlaylists,
  getSpotifyProfile,
  getLikedSongs,
} from "../Services/spotifyService";
import PlaylistCard from "../component/playlist/PlaylistCard";
import LikedSongsCard from "../component/playlist/LikedSongsCard";
import SpotifyLoader from "./common/SpotifyLoader";
import "../SpotifyProfile.css";

export default function SpotifyProfile({ token }) {
  const [profile, setProfile] = useState(null);
  const [playlists, setPlaylists] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [profileData, playlistData, likedData] = await Promise.all([
          getSpotifyProfile(),
          getUserPlaylists(),
          getLikedSongs(50, 0),
        ]);

        setProfile(profileData.profile);

        const likedPlaylist = {
          id: "liked-songs",
          name: "Liked Songs",
          images: [
            {
              url:
                likedData.cleanedTracks?.[0]?.album?.image ||
                "https://misc.scdn.co/liked-songs/liked-songs-640.png",
            },
          ],
          description: `Your ${likedData.cleanedTracks.length} liked songs`,
          tracks: {
            total: likedData.cleanedTracks.length,
          },
          isLikedSongs: true,
        };

        setPlaylists([likedPlaylist, ...playlistData]);
      } catch (error) {
        console.error("Error fetching Spotify data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [token]);

  if (loading) {
    return <SpotifyLoader message="Loading your Spotify data" />;
  }

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="spotify-profile-container p-4 sm:p-6 space-y-8"
    >
      {/* Profile Header */}
      <motion.div 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="profile-header flex flex-col sm:flex-row items-center sm:items-end gap-4 sm:gap-6 px-4 sm:px-6 py-6 sm:py-8 bg-gradient-to-b from-[#535353] via-[#121212] to-black rounded-xl shadow-2xl w-full relative overflow-hidden"
      >
        {/* Animated background gradient */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#1db954]/10 via-transparent to-[#1db954]/10 animate-gradient-x"></div>
        
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="profile-image flex-shrink-0 relative group"
        >
          {profile?.images?.[0]?.url ? (
            <img
              src={profile.images[0].url}
              alt="Profile"
              className="w-24 h-24 sm:w-32 sm:h-32 object-cover rounded-full border-4 border-[#1db954] shadow-lg transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full bg-[#282828] flex items-center justify-center text-3xl sm:text-4xl text-white font-bold border-4 border-[#1db954] shadow-lg transition-transform duration-300 group-hover:scale-105">
              {profile?.display_name?.charAt(0) || "U"}
            </div>
          )}
        </motion.div>

        <motion.div 
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="profile-info text-white text-center sm:text-left w-full"
        >
          <p className="uppercase text-xs font-bold tracking-widest text-[#b3b3b3] mb-1">
            Profile
          </p>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold leading-tight break-words bg-clip-text text-transparent bg-gradient-to-r from-white to-[#1db954]">
            {profile?.display_name || "Spotify User"}
          </h2>
          <p className="text-[#b3b3b3] mt-1 text-sm sm:text-base break-words">
            {profile?.email || ""}
          </p>
          <p className="text-[#b3b3b3] mt-1 text-sm sm:text-base break-words">
            id : {profile?.id || ""}
          </p>

          <div className="extra-info text-xs sm:text-sm text-[#b3b3b3] mt-3 sm:mt-4 space-y-1 sm:space-y-1">
            <div className="flex flex-wrap justify-center sm:justify-start gap-x-4 gap-y-1">
              <motion.p 
                whileHover={{ scale: 1.05 }}
                className="hover:text-[#1db954] transition-colors"
              >
                Country: {profile?.country || "N/A"}
              </motion.p>
              <motion.p 
                whileHover={{ scale: 1.05 }}
                className="hover:text-[#1db954] transition-colors"
              >
                Plan:{" "}
                {profile?.product
                  ? profile.product.charAt(0).toUpperCase() +
                    profile.product.slice(1)
                  : "N/A"}
              </motion.p>
              <motion.p 
                whileHover={{ scale: 1.05 }}
                className="hover:text-[#1db954] transition-colors"
              >
                Followers: {profile?.followers?.total?.toLocaleString() ?? 0}
              </motion.p>
            </div>

            {profile?.external_urls?.spotify && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="mt-2 sm:mt-3"
              >
                <a
                  href={profile.external_urls.spotify}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block text-[#1db954] hover:text-white font-medium text-sm sm:text-base transition-colors duration-300 hover:bg-[#1db954] px-4 py-2 rounded-full"
                >
                  View Profile on Spotify
                </a>
              </motion.div>
            )}
          </div>
        </motion.div>
      </motion.div>

      {/* Playlist Section */}
      <motion.div 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="playlist-section"
      >
        <h3 className="text-white text-2xl font-bold mb-6 flex items-center gap-2">
          <span className="w-1 h-6 bg-[#1db954] rounded-full"></span>
          Your Playlists
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          <AnimatePresence>
            {playlists.map((playlist, index) => (
              <motion.div
                key={playlist.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ y: -5 }}
              >
                {playlist.isLikedSongs ? (
                  <LikedSongsCard
                    likedPlaylist={playlist}
                    onPlay={() => console.log("Play Liked Songs")}
                  />
                ) : (
                  <PlaylistCard
                    playlist={playlist}
                    onPlay={() => console.log(`Play ${playlist.name}`)}
                  />
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  );
}
