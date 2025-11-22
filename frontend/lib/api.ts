// API client utility for backend communication
import { env } from './config';

const API_BASE_URL = env.API_URL;

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

async function apiFetch<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new ApiError(
        response.status,
        `API Error: ${response.statusText} - ${errorText}`
      );
    }

    return await response.json();
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new Error(`Network error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Arena API
export const arenaApi = {
  // Create a new match
  createMatch: async (prompt: string, userId?: string) => {
    return apiFetch<{
      matchId: string;
      prompt: string;
      responseA: string;
      responseB: string;
      modelAId: string;
      modelBId: string;
    }>('/arena/match', {
      method: 'POST',
      body: JSON.stringify({ prompt, userId }),
    });
  },

  // Submit a vote
  vote: async (matchId: string, winner: 'A' | 'B' | 'tie' | 'both-bad', userId?: string) => {
    return apiFetch<{
      success: boolean;
      message: string;
      userScore?: number;
    }>('/arena/vote', {
      method: 'POST',
      body: JSON.stringify({ matchId, winner, userId }),
    });
  },
};

// Leaderboard API
export const leaderboardApi = {
  // Get model rankings
  getModels: async () => {
    return apiFetch<Array<{
      rank: number;
      id: string;
      name: string;
      provider: string;
      rating: number;
      gamesPlayed: number;
    }>>('/leaderboard/models');
  },

  // Get user rankings
  getUsers: async () => {
    return apiFetch<Array<{
      rank: number;
      id: string;
      nickname: string;
      score: number;
    }>>('/leaderboard/users');
  },
};

// Health check
export const healthCheck = async () => {
  return apiFetch<{ ok: boolean }>('/health');
};

export { ApiError };
