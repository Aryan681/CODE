const spotifyService = require("../services/spotifyService");
const refreshAccessToken = require ("../utils/spotifyauth")
exports.initiateSpotifyLogin = (req, res) => {
  const url = spotifyService.getAuthorizationUrl(req.user.id);
  return res.json({ url });
};

exports.handleSpotifyCallback = async (req, res) => {
  try {
    const { code, state } = req.query;
    const userId = state || req.user?.id;

    if (!code || !userId) {
      return res
        .status(400)
        .json({ success: false, message: "Missing code or user" });
    }

    const { spotifyId, accessToken, refreshToken, expiresIn } =
      await spotifyService.exchangeTokenAndSaveUser(code, userId);

    return res.redirect(
      `http://localhost:5173/dashboard/spotify?token=${encodeURIComponent(
        accessToken
      )}&refreshToken=${encodeURIComponent(
        refreshToken
      )}&expiresIn=${encodeURIComponent(expiresIn)}`
    );
  } catch (error) {
    console.error(
      "❌ Spotify Callback Error:",
      error.response?.data || error.message || error
    );
    res
      .status(500)
      .json({ success: false, message: "Failed to connect Spotify" });
  }
};


exports.handleRefreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ message: "Refresh token is required" });
    }

    const newTokenData = await refreshAccessToken(refreshToken);

    res.json({
      accessToken: newTokenData.access_token,
      expiresIn: newTokenData.expires_in,
    });
  } catch (error) {
    console.error("Token refresh failed", error.response?.data || error.message);
    res.status(500).json({ message: "Failed to refresh token" });
  }
};

exports.getSpotifyProfile = async (req, res) => {
  try {
    const profile = await spotifyService.fetchSpotifyProfile(req.user.id);
    res.json({ success: true, profile });
  } catch (error) {
    console.error(
      "❌ Get Spotify Profile Error:",
      error.response?.data || error.message || error
    );
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch profile" });
  }
};

exports.getPlaylistTracks = async (req, res) => {
  try {
    const { playlistId } = req.params;
    const tracks = await spotifyService.getPlaylistTracks(
      req.user.id,
      playlistId
    );
    res.json({ success: true, tracks });
  } catch (error) {
    console.error(
      "❌ Get Playlist Tracks Error:",
      error.response?.data || error.message || error
    );
    res.status(error.message?.includes("expired") ? 401 : 500).json({
      success: false,
      message: "Failed to fetch playlist tracks",
    });
  }
};

exports.playTrack = async (req, res) => {
  try {
    const { trackUri, deviceId } = req.body;
    if (!deviceId) {
      return res.status(400).json({ 
        success: false, 
        message: "Device ID is required" 
      });
    }
    await spotifyService.playTrack(req.user.id, trackUri, deviceId);
    res.json({ success: true, message: "Playback started" });
  } catch (error) {
    console.error(
      "❌ Play Error:",
      error.response?.data || error.message || error
    );
    res.status(500).json({ success: false, message: "Failed to play track" });
  }
};

exports.pauseTrack = async (req, res) => {
  try {
    await spotifyService.pauseTrack(req.user.id);
    res.json({ success: true, message: "Playback paused" });
  } catch (error) {
    console.error(
      "❌ Pause Error:",
      error.response?.data || error.message || error
    );
    res
      .status(500)
      .json({ success: false, message: "Failed to pause playback" });
  }
};

exports.resumeTrack = async (req, res) => {
  try {
    await spotifyService.resumeTrack(req.user.id);
    res.json({ success: true, message: "Playback resumed" });
  } catch (error) {
    console.error(
      "❌ Resume Error:",
      error.response?.data || error.message || error
    );
    res
      .status(500)
      .json({ success: false, message: "Failed to resume playback" });
  }
};

exports.getUserPlaylists = async (req, res) => {
  try {
    const raw = await spotifyService.fetchUserPlaylists(req.user.id);

    const playlists = raw.items.map((p) => ({
      id: p.id,
      name: p.name,
      totalTracks: p.tracks.total,
      coverImage: p.images?.[0]?.url || null,
      owner: p.owner?.display_name || "Unknown",
    }));

    res.status(200).json({ success: true, playlists });
  } catch (error) {
    console.error(
      "❌ Get Playlists Error:",
      error.response?.data || error.message || error
    );
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch playlists" });
  }
};

exports.getLikedSongs = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;

    const data = await spotifyService.fetchLikedSongs(req.user.id);

    const cleanedTracks = data.items.map((item) => ({
      id: item.track.id,
      uri: item.track.uri,
      name: item.track.name,
      artists: item.track.artists.map((artist) => artist.name),
      album: {
        name: item.track.album.name,
        image: item.track.album.images?.[0]?.url || null,
      },
      duration: item.track.duration_ms, // <- Add this line
      added_at: item.added_at,
    }));

    res.status(200).json({ success: true, cleanedTracks });
  } catch (error) {
    console.error(
      "❌ Liked Songs Error:",
      error.response?.data || error.message || error
    );
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch liked songs" });
  }
};


exports.skipTrack = async (req, res) => {
  const action = req.query.action;

  try {
    if (action === "next") {
      await spotifyService.nextTrack(req.user.id);
      return res.json({ success: true, message: "Skipped to next track" });
    } else if (action === "previous") {
      await spotifyService.previousTrack(req.user.id);
      return res.json({ success: true, message: "Skipped to previous track" });
    } else {
      return res.status(400).json({
        success: false,
        message: "Invalid action. Use ?action=next or ?action=previous",
      });
    }
  } catch (error) {
    console.error(
      "❌ Skip Track Error:",
      error.response?.data || error.message || error
    );
    res.status(500).json({ success: false, message: "Failed to skip track" });
  }
};

exports.likeTrack = async (req, res) => {
  try {
    const { trackId } = req.body;
    if (!trackId) {
      return res
        .status(400)
        .json({ success: false, message: "trackId is required" });
    }

    await spotifyService.likeTrack(req.user.id, trackId);
    res.json({ success: true, message: "Track added to liked songs" });
  } catch (error) {
    console.error(
      "❌ Like Track Error:",
      error.response?.data || error.message || error
    );
    res.status(500).json({ success: false, message: "Failed to like track" });
  }
};

exports.setVolume = async (req, res) => {
  const { volume } = req.body; // Volume passed from the client
  const accessToken = req.user.spotifyAccessToken;

  try {
    const response = await axios.put(
      "https://api.spotify.com/v1/me/player/volume",
      {
        volume_percent: volume,
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (response.status === 200) {
      res.status(200).send({ message: "Volume set successfully" });
    } else {
      res.status(400).send({ message: "Failed to set volume" });
    }
  } catch (error) {
    res.status(500).send({ message: "Error setting volume", error: error.message });
  }
};

exports.getCurrentPlaybackState = async (req, res) => {
  const accessToken = req.user.spotifyAccessToken;

  try {
    const response = await axios.get("https://api.spotify.com/v1/me/player", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (response.status === 200) {
      res.status(200).send(response.data);
    } else {
      res.status(400).send({ message: "Failed to fetch playback state" });
    }
  } catch (error) {
    res.status(500).send({ message: "Error getting playback state", error: error.message });
  }
};

exports.addTrackToPlaylist = async (req, res) => {
  try {
    const { playlistId, trackUri } = req.body;
    if (!playlistId || !trackUri) {
      return res
        .status(400)
        .json({
          success: false,
          message: "playlistId and trackUri are required",
        });
    }

    await spotifyService.addTrackToPlaylist(req.user.id, playlistId, trackUri);
    res.json({ success: true, message: "Track added to playlist" });
  } catch (error) {
    console.error(
      "❌ Add to Playlist Error:",
      error.response?.data || error.message || error
    );
    res
      .status(500)
      .json({ success: false, message: "Failed to add track to playlist" });
  }
};

exports.unlikeTrack = async (req, res) => {
  try {
    const { trackId } = req.body;
    if (!trackId) {
      return res
        .status(400)
        .json({ success: false, message: "trackId is required" });
    }

    await spotifyService.unlikeTrack(req.user.id, trackId);
    res.json({ success: true, message: "Track removed from liked songs" });
  } catch (error) {
    console.error(
      "❌ Unlike Track Error:",
      error.response?.data || error.message || error
    );
    res.status(500).json({ success: false, message: "Failed to unlike track" });
  }
};

exports.removeTrackFromPlaylist = async (req, res) => {
  try {
    const { playlistId, trackUri } = req.body;
    if (!playlistId || !trackUri) {
      return res
        .status(400)
        .json({
          success: false,
          message: "playlistId and trackUri are required",
        });
    }

    await spotifyService.removeTrackFromPlaylist(
      req.user.id,
      playlistId,
      trackUri
    );
    res.json({ success: true, message: "Track removed from playlist" });
  } catch (error) {
    console.error(
      "❌ Remove from Playlist Error:",
      error.response?.data || error.message || error
    );
    res
      .status(500)
      .json({
        success: false,
        message: "Failed to remove track from playlist",
      });
  }
};

exports.isTrackLiked = async (req, res) => {
  try {
    const { trackId } = req.query;
    if (!trackId) {
      return res
        .status(400)
        .json({ success: false, message: "trackId is required" });
    }

    const liked = await spotifyService.isTrackLiked(req.user.id, trackId);
    res.json({ success: true, liked });
  } catch (error) {
    console.error(
      "❌ Check Liked Error:",
      error.response?.data || error.message || error
    );
    res
      .status(500)
      .json({ success: false, message: "Failed to check liked status" });
  }
};
