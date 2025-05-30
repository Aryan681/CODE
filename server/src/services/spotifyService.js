const axios = require("axios");
const qs = require("qs");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const redisClient = require("../utils/redisClient");
const { callSpotifyApi } = require("../utils/spotifyApiClient"); // use your correct path

const API_BASE = "http://localhost:3000/api/spotify";
const CACHE_PREFIX = "spotify:";

// Cache TTLs (in seconds)
const CACHE_TTL = {
    PROFILE: 1800,        // 30 minutes
    PLAYLISTS: 3600,      // 1 hour
    PLAYLIST_TRACKS: 1800, // 30 minutes
    LIKED_SONGS: 1800,    // 30 minutes
    CURRENT_PLAYBACK: 30,  // 30 seconds
    TOP_TRACKS: 3600,     // 1 hour
    TOP_ARTISTS: 3600,    // 1 hour
    RECENT_TRACKS: 300    // 5 minutes
};

const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
const REDIRECT_URI = process.env.SPOTIFY_REDIRECT_URI;

const getCacheKey = (endpoint, params = {}) => {
  const paramString = Object.entries(params)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([key, value]) => `${key}=${value}`)
    .join("&");
  return `${CACHE_PREFIX}${endpoint}${paramString ? `?${paramString}` : ""}`;
};

const SCOPES = [
  // 🔓 User identity
  "user-read-email",
  "user-read-private",

  // 🎧 Playback control
  "user-read-playback-state",
  "user-modify-playback-state",
  "user-read-currently-playing",
  "streaming",

  // ❤️ Liked (saved) songs
  "user-library-read",
  "user-library-modify",

  // 📂 Playlists - read/write
  "playlist-read-private",
  "playlist-read-collaborative",
  "playlist-modify-public",
  "playlist-modify-private",

  // 🕒 Recent history
  "user-read-recently-played",

  // 📊 Top tracks/artists
  "user-top-read",
].join(" ");

exports.getAuthorizationUrl = (userId) => {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: CLIENT_ID,
    scope: SCOPES,
    redirect_uri: REDIRECT_URI,
    state: userId,
  });

  return `https://accounts.spotify.com/authorize?${params.toString()}`;
};

exports.exchangeTokenAndSaveUser = async (code, userId) => {
  const tokenRes = await axios.post(
    "https://accounts.spotify.com/api/token",
    qs.stringify({
      code,
      redirect_uri: REDIRECT_URI,
      grant_type: "authorization_code",
    }),
    {
      headers: {
        Authorization: `Basic ${Buffer.from(
          `${CLIENT_ID}:${CLIENT_SECRET}`
        ).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
    }
  );

  const { access_token, refresh_token, expires_in } = tokenRes.data;

  const userInfoRes = await axios.get("https://api.spotify.com/v1/me", {
    headers: { Authorization: `Bearer ${access_token}` },
  });

  const data = userInfoRes.data;

  const spotifyData = {
    accessToken: access_token,
    refreshToken: refresh_token,
    expiresAt: new Date(Date.now() + expires_in * 1000),
    spotifyId: data.id,
    displayName: data.display_name,
    email: data.email,
    country: data.country,
    product: data.product,
    avatarUrl: data.images?.[0]?.url || null,
    scope: SCOPES,
  };

  await prisma.spotifyAccount.upsert({
    where: { userId },
    update: spotifyData,
    create: { userId, ...spotifyData },
  });

  return {
    spotifyId: data.id,
    accessToken: access_token,
    refreshToken: refresh_token, 
    expiresIn: expires_in,
  };
};

// Enhanced caching wrapper
const withCache = async (key, fetchFn, ttl, options = {}) => {
    return redisClient.getWithCache(key, fetchFn, {
        ttl,
        compress: true, // Enable compression for large responses
        prefix: CACHE_PREFIX,
        ...options
    });
};

// Cache invalidation helper
const invalidateUserCache = async (userId) => {
    const patterns = [
        `profile:${userId}`,
        `playlists:${userId}`,
        `liked-songs:${userId}`,
        `top-tracks:${userId}`,
        `top-artists:${userId}`,
        `recent-tracks:${userId}`
    ];
    
    await Promise.all(patterns.map(pattern => 
        redisClient.invalidateCache(pattern)
    ));
};

// Profile (cached)
exports.fetchSpotifyProfile = async (userId) => {
    const cacheKey = getCacheKey(`profile:${userId}`);
    return withCache(
        cacheKey,
        async () => {
            return await callSpotifyApi(userId, async (token) => {
                const res = await axios.get("https://api.spotify.com/v1/me", {
                    headers: { Authorization: `Bearer ${token}` },
                });
                return res.data;
            });
        },
        CACHE_TTL.PROFILE
    );
};

// Playlists (cached)
exports.fetchUserPlaylists = async (userId) => {
    const cacheKey = getCacheKey(`playlists:${userId}`);
    return withCache(
        cacheKey,
        async () => {
            return await callSpotifyApi(userId, async (token) => {
                const res = await axios.get("https://api.spotify.com/v1/me/playlists", {
                    headers: { Authorization: `Bearer ${token}` },
                });
                return res.data;
            });
        },
        CACHE_TTL.PLAYLISTS
    );
};

// Playlist Tracks (cached)
exports.getPlaylistTracks = async (userId, playlistId) => {
    const cacheKey = getCacheKey(`playlist-tracks:${userId}:${playlistId}`);
    return withCache(
        cacheKey,
        async () => {
            return await callSpotifyApi(userId, async (token) => {
                const allTracks = [];
                const limit = 100;
                let offset = 0;
                let totalFetched = 0;

                while (totalFetched < 300) {
                    const response = await axios.get(
                        `https://api.spotify.com/v1/playlists/${playlistId}/tracks`,
                        {
                            headers: {
                                Authorization: `Bearer ${token}`,
                                "Content-Type": "application/json",
                            },
                            params: {
                                limit,
                                offset,
                                fields: "items(track(id,name,uri,duration_ms,artists(name),album(name,images))),next",
                            },
                        }
                    );

                    const tracks = response.data.items.map(item => item.track);
                    allTracks.push(...tracks);
                    totalFetched += tracks.length;

                    if (!response.data.next || totalFetched >= 300) break;
                    offset += limit;
                }

                return allTracks;
            });
        },
        CACHE_TTL.PLAYLIST_TRACKS
    );
};

// Liked Songs (cached)
exports.getLikedSongs = async (userId) => {
    const cacheKey = getCacheKey(`liked-songs:${userId}`);
    return withCache(
        cacheKey,
        async () => {
            return await callSpotifyApi(userId, async (token) => {
                const allTracks = [];
                const limit = 50;
                let offset = 0;

                while (true) {
                    const response = await axios.get(
                        "https://api.spotify.com/v1/me/tracks",
                        {
                            headers: { Authorization: `Bearer ${token}` },
                            params: { limit, offset },
                        }
                    );

                    const tracks = response.data.items.map(item => item.track);
                    allTracks.push(...tracks);

                    if (!response.data.next) break;
                    offset += limit;
                }

                return allTracks;
            });
        },
        CACHE_TTL.LIKED_SONGS
    );
};

// Current Playback (cached with short TTL)
exports.getCurrentPlaybackState = async (userId) => {
    const cacheKey = getCacheKey(`playback:${userId}`);
    return withCache(
        cacheKey,
        async () => {
            return await callSpotifyApi(userId, async (token) => {
                const res = await axios.get("https://api.spotify.com/v1/me/player", {
                    headers: { Authorization: `Bearer ${token}` },
                });
                return res.data;
            });
        },
        CACHE_TTL.CURRENT_PLAYBACK
    );
};

// Invalidate cache when user makes changes
exports.playTrack = async (userId, trackUri, deviceId) => {
    await invalidateUserCache(userId);
    return await callSpotifyApi(userId, async (token) =>
        axios.put(
            "https://api.spotify.com/v1/me/player/play",
            trackUri ? { uris: [trackUri] } : {},
            {
                headers: { Authorization: `Bearer ${token}` },
                params: { device_id: deviceId }
            }
        )
    );
};

exports.pauseTrack = async (userId) => {
    await invalidateUserCache(userId);
    return await callSpotifyApi(userId, async (token) =>
        axios.put(
            "https://api.spotify.com/v1/me/player/pause",
            {},
            {
                headers: { Authorization: `Bearer ${token}` },
            }
        )
    );
};

exports.resumeTrack = async (userId) => exports.playTrack(userId);

// ✅ Profile (cached)
exports.fetchSpotifyProfile = async (userId) => {
  const cacheKey = getCacheKey(`profile:${userId}`);
  return redisClient.getWithCache(
    cacheKey,
    async () => {
      return await callSpotifyApi(userId, async (token) => {
        const res = await axios.get("https://api.spotify.com/v1/me", {
          headers: { Authorization: `Bearer ${token}` },
        });
        return res.data;
      });
    },
    1800
  ); // 30 mins
};

// ✅ Playlists (cached)
exports.fetchUserPlaylists = async (userId) => {
  const cacheKey = getCacheKey(`playlists:${userId}`);
  return redisClient.getWithCache(
    cacheKey,
    async () => {
      return await callSpotifyApi(userId, async (token) => {
        const res = await axios.get("https://api.spotify.com/v1/me/playlists", {
          headers: { Authorization: `Bearer ${token}` },
        });
        return res.data;
      });
    },
    3600
  ); // 1 hour
};

// ✅ Playlist Tracks (cached)
exports.getPlaylistTracks = async (userId, playlistId) => {
  const cacheKey = getCacheKey(`playlist-tracks:${userId}:${playlistId}`);
  return redisClient.getWithCache(
    cacheKey,
    async () => {
      return await callSpotifyApi(userId, async (token) => {
        const allTracks = [];
        const limit = 100;
        let offset = 0;
        let totalFetched = 0;

        while (totalFetched < 300) {
          const response = await axios.get(
            `https://api.spotify.com/v1/playlists/${playlistId}/tracks`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
              },
              params: {
                limit,
                offset,
                fields:
                  "items(track(id,name,uri,duration_ms,artists(name),album(name,images))),next",
              },
            }
          );

          const tracks = response.data.items.map((item) => ({
            id: item.track.id,
            name: item.track.name,
            uri: item.track.uri,
            duration: item.track.duration_ms,
            artists: item.track.artists.map((artist) => artist.name),
            album: {
              name: item.track.album.name,
              image: item.track.album.images?.[0]?.url || null,
            },
            added_at: new Date().toISOString(),
          }));

          allTracks.push(...tracks);
          totalFetched += tracks.length;

          if (!response.data.next || tracks.length < limit) break;
          offset += limit;
        }

        return allTracks.slice(0, 300);
      });
    },
    3600
  ); // 1 hour
};

// ✅ Liked Songs (cached)
exports.fetchLikedSongs = async (userId) => {
  const cacheKey = getCacheKey(`liked-songs:${userId}`);
  return redisClient.getWithCache(
    cacheKey,
    async () => {
      return await callSpotifyApi(userId, async (token) => {
        let allTracks = [];
        let limit = 50;
        let offset = 0;
        let hasNext = true;

        while (hasNext) {
          const res = await axios.get("https://api.spotify.com/v1/me/tracks", {
            headers: { Authorization: `Bearer ${token}` },
            params: { limit, offset },
          });

          const data = res.data;
          allTracks = allTracks.concat(data.items);

          offset += limit;
          hasNext = data.next !== null;
        }

        return { items: allTracks };
      });
    },
    1800
  ); // 30 mins
};

exports.nextTrack = async (userId) =>
  await callSpotifyApi(userId, async (token) =>
    axios.post(
      "https://api.spotify.com/v1/me/player/next",
      {},
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    )
  );

exports.previousTrack = async (userId) =>
  await callSpotifyApi(userId, async (token) =>
    axios.post(
      "https://api.spotify.com/v1/me/player/previous",
      {},
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    )
  );

exports.likeTrack = async (userId, trackId) =>
  await callSpotifyApi(userId, async (token) =>
    axios.put(
      "https://api.spotify.com/v1/me/tracks",
      { ids: [trackId] },
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    )
  );

exports.unlikeTrack = async (userId, trackId) =>
  await callSpotifyApi(userId, async (token) =>
    axios.delete("https://api.spotify.com/v1/me/tracks", {
      headers: { Authorization: `Bearer ${token}` },
      data: { ids: [trackId] },
    })
  );

exports.addTrackToPlaylist = async (userId, playlistId, trackUri) =>
  await callSpotifyApi(userId, async (token) =>
    axios.post(
      `https://api.spotify.com/v1/playlists/${playlistId}/tracks`,
      { uris: [trackUri] },
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    )
  );

exports.removeTrackFromPlaylist = async (userId, playlistId, trackUri) =>
  await callSpotifyApi(userId, async (token) =>
    axios.delete(`https://api.spotify.com/v1/playlists/${playlistId}/tracks`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { tracks: [{ uri: trackUri }] },
    })
  );

exports.isTrackLiked = async (userId, trackId) =>
  await callSpotifyApi(userId, async (token) => {
    const res = await axios.get(
      `https://api.spotify.com/v1/me/tracks/contains?ids=${trackId}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    return res.data[0]; // true or false
  });
