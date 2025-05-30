const { PrismaClient } = require('@prisma/client');
const axios = require('axios');
const redisClient = require('../utils/redisClient');
const prisma = new PrismaClient();

/**
 * Gets GitHub access token from Redis or database
 * @param {string} userId 
 * @returns {Promise<string>} GitHub access token
 */
async function getGitHubToken(userId) {
  try {
    // 1. Try Redis first
    const cachedToken = await redisClient.get(`github:token:${userId}`);
    if (cachedToken) return cachedToken;

    // 2. Fall back to database
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { githubAccessToken: true }
    });

    if (!user?.githubAccessToken) {
      throw new Error('GitHub access token not found');
    }

    // Cache the token in Redis for future use
    await redisClient.set(`github:token:${userId}`, user.githubAccessToken, {
      EX: 3600 // 1 hour expiration
    });

    return user.githubAccessToken;
  } catch (error) {
    console.error('Error getting GitHub token:', error);
    throw error;
  }
}

/**
 * Fetches GitHub repositories with automatic token refresh on failure
 * @param {string} userId 
 * @param {string} accessToken 
 * @returns 
 */
async function fetchReposWithToken(userId, accessToken) {
  try {
    const response = await axios.get('https://api.github.com/user/repos', {
      headers: {
        Authorization: `token ${accessToken}`,
        Accept: 'application/vnd.github.v3+json',
        'X-GitHub-Api-Version': '2022-11-28'
      },
      params: {
        sort: 'updated',
        direction: 'desc',
        per_page: 100 // Get maximum allowed per page
      }
    });

    return response.data.map(repo => ({
      id: repo.id,
      name: repo.name,
      fullName: repo.full_name,
      private: repo.private,
      htmlUrl: repo.html_url,
      description: repo.description,
      createdAt: repo.created_at,
      updatedAt: repo.updated_at,
      pushedAt: repo.pushed_at,
      stars: repo.stargazers_count,
      forks: repo.forks_count,
      language: repo.language,
      archived: repo.archived,
      disabled: repo.disabled,
      visibility: repo.visibility
    }));
  } catch (error) {
    if (error.response?.status === 401) {
      // Token might be expired, remove from cache
      await redisClient.del(`github:token:${userId}`);
      throw new Error('GitHub token expired - please reauthenticate');
    }
    throw error;
  }
}

/**
 * Fetches GitHub repositories for a user
 * @param {string} userId 
 * @returns {Promise<Array>} 
 */
const fetchGitHubRepos = async (userId) => {
  try {
    // 1. Get access token (from Redis or DB)
    const accessToken = await getGitHubToken(userId);

    // 2. Fetch repositories
    return await fetchReposWithToken(userId, accessToken);
  } catch (error) {
    console.error('Error in fetchGitHubRepos:', error);
    
    // Handle specific error cases
    if (error.message.includes('token not found')) {
      error.statusCode = 404;
    } else if (error.message.includes('expired') || error.response?.status === 401) {
      error.statusCode = 401;
    } else if (error.response?.status === 403) {
      error.statusCode = 429; // Rate limited
    }

    throw error;
  }
};

const createGitHubRepo = async (userId, repoData) => {
  try {
    // Get user with GitHub access token
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { githubAccessToken: true }
    });

    if (!user?.githubAccessToken) {
      throw new Error('GitHub access token not found for this user');
    }

    // Create repository via GitHub API
    const response = await axios.post('https://api.github.com/user/repos', repoData, {
      headers: {
        Authorization: `Bearer ${user.githubAccessToken}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28'
      }
    });

    // Format the response
    return {
      id: response.data.id,
      name: response.data.name,
      fullName: response.data.full_name,
      htmlUrl: response.data.html_url,
      private: response.data.private,
      createdAt: response.data.created_at,
      updatedAt: response.data.updated_at,
      visibility: response.data.visibility
    };
  } catch (error) {
    console.error('GitHub repo creation failed:', error.response?.data || error.message);
    
    // Handle specific GitHub API errors
    if (error.response) {
      if (error.response.status === 401) {
        throw new Error('GitHub authentication failed - token may be invalid');
      }
      if (error.response.status === 422) {
        throw new Error('Repository creation validation failed: ' + 
          (error.response.data.message || 'Invalid repository data'));
      }
    }
    
    throw new Error('Failed to create repository: ' + error.message);
  }
};

const deleteGitHubRepo = async (userId, repoOwner, repoName) => {
  try {
    // Get user with GitHub access token
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { 
        githubAccessToken: true,
        githubUsername: true 
      }
    });

    if (!user?.githubAccessToken) {
      throw new Error('GitHub access token not found for this user');
    }

    // Verify the requesting user owns the repo
    if (repoOwner !== user.githubUsername) {
      throw new Error('You can only delete repositories you own');
    }

    // Delete repository via GitHub API
    const response = await axios.delete(
      `https://api.github.com/repos/${repoOwner}/${repoName}`,
      {
        headers: {
          Authorization: `Bearer ${user.githubAccessToken}`,
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28'
        }
      }
    );

    // GitHub returns 204 on successful deletion
    if (response.status === 204) {
      return { 
        success: true,
        message: 'Repository deleted successfully',
        repo: `${repoOwner}/${repoName}`
      };
    }

    throw new Error('Unexpected response from GitHub API');
  } catch (error) {
    console.error('GitHub repo deletion failed:', error.response?.data || error.message);
    
    // Handle specific GitHub API errors
    if (error.response) {
      if (error.response.status === 401) {
        throw new Error('GitHub authentication failed - token may be invalid');
      }
      if (error.response.status === 403) {
        throw new Error('Permission denied - check your token permissions');
      }
      if (error.response.status === 404) {
        throw new Error('Repository not found or already deleted');
      }
    }
    
    throw new Error('Failed to delete repository: ' + error.message);
  }
};
// Add this new function to your existing projectService.js
const updateGitHubRepo = async (userId, repoOwner, repoName, updateData) => {
  try {
    // Get user with GitHub access token
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { 
        githubAccessToken: true,
        githubUsername: true 
      }
    });

    if (!user?.githubAccessToken) {
      throw new Error('GitHub access token not found for this user');
    }

    // Verify the requesting user owns the repo
    if (repoOwner !== user.githubUsername) {
      throw new Error('You can only update repositories you own');
    }

    // Update repository via GitHub API
    const response = await axios.patch(
      `https://api.github.com/repos/${repoOwner}/${repoName}`,
      updateData,
      {
        headers: {
          Authorization: `Bearer ${user.githubAccessToken}`,
          Accept: 'application/vnd.github+json',
          'Content-Type': 'application/json',
          'X-GitHub-Api-Version': '2022-11-28'
        }
      }
    );

    // Format the response
    return {
      id: response.data.id,
      name: response.data.name,
      fullName: response.data.full_name,
      htmlUrl: response.data.html_url,
      private: response.data.private,
      description: response.data.description,
      visibility: response.data.visibility,
      updatedAt: response.data.updated_at
    };
  } catch (error) {
    console.error('GitHub repo update failed:', error.response?.data || error.message);
    
    // Handle specific GitHub API errors
    if (error.response) {
      if (error.response.status === 401) {
        throw new Error('GitHub authentication failed - token may be invalid');
      }
      if (error.response.status === 403) {
        throw new Error('Permission denied - check your token permissions');
      }
      if (error.response.status === 404) {
        throw new Error('Repository not found');
      }
      if (error.response.status === 422) {
        throw new Error('Invalid update data: ' + 
          (error.response.data.message || 'Validation failed'));
      }
    }
    
    throw new Error('Failed to update repository: ' + error.message);
  }
};

// Add this new function to your existing projectService.js
const searchGitHubRepos = async (userId, searchQuery) => {
  try {
    // Get user with GitHub access token and username
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { 
        githubAccessToken: true,
        githubUsername: true 
      }
    });

    if (!user?.githubAccessToken || !user?.githubUsername) {
      throw new Error('GitHub credentials not found for this user');
    }

    // Search repositories via GitHub API
    const response = await axios.get(
      `https://api.github.com/search/repositories?q=${encodeURIComponent(searchQuery)}+user:${user.githubUsername}`,
      {
        headers: {
          Authorization: `Bearer ${user.githubAccessToken}`,
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28'
        }
      }
    );

    // Format the response
    return response.data.items.map(repo => ({
      id: repo.id,
      name: repo.name,
      fullName: repo.full_name,
      private: repo.private,
      htmlUrl: repo.html_url,
      description: repo.description,
      createdAt: repo.created_at,
      updatedAt: repo.updated_at,
      stars: repo.stargazers_count,
      forks: repo.forks_count,
      language: repo.language,
      owner: repo.owner.login
    }));
  } catch (error) {
    console.error('GitHub repo search failed:', error.response?.data || error.message);
    
    // Handle specific GitHub API errors
    if (error.response) {
      if (error.response.status === 401) {
        throw new Error('GitHub authentication failed - token may be invalid');
      }
      if (error.response.status === 403) {
        throw new Error('API rate limit exceeded - try again later');
      }
      if (error.response.status === 422) {
        throw new Error('Invalid search query');
      }
    }
    
    throw new Error('Failed to search repositories: ' + error.message);
  }
};

// Add to your existing exports
module.exports = { 
  fetchGitHubRepos,
  createGitHubRepo,
  deleteGitHubRepo,
  updateGitHubRepo,
  searchGitHubRepos
};

