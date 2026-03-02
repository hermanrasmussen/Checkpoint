export type LibraryStatus = 'playing' | 'completed' | 'backlog' | 'dropped';

export interface GameSummary {
  api_id: string;
  title: string;
  cover_url: string | null;
  grid_url: string | null;
  hero_url: string | null;
  developer: string | null;
  release_year: number | null;
  genre: string[];
  api_source: string;
  steam_appid?: number | null;
}

export interface LibraryEntryGame {
  id: string;
  api_id: string;
  title: string;
  cover_url: string | null;
  grid_url: string | null;
  hero_url: string | null;
  developer: string | null;
  release_year: number | null;
  genre: string[];
  api_source: string;
}

export interface LibraryEntry {
  id: string;
  status: LibraryStatus;
  rating: number | null;
  added_at: string;
  updated_at: string;
  game: LibraryEntryGame;
}

export interface GridItem {
  id: number;
  url: string;
  thumb: string | null;
  width: number | null;
  height: number | null;
}

export interface Stats {
  total: number;
  by_status: Record<LibraryStatus, number>;
  average_rating: number | null;
  recent: LibraryEntry[];
}

export interface UserProfile {
  user_id: string;
  username: string | null;
  avatar_id: number;
  steam_id?: string | null;
}

export interface PublicProfile {
  user_id: string;
  username: string | null;
  avatar_id: number;
  library: LibraryEntry[];
  collections: Collection[];
  follower_count: number;
  following_count: number;
  is_followed_by_me: boolean;
}

export interface CollectionGame {
  id: string;
  api_id: string;
  title: string;
  cover_url: string | null;
  grid_url: string | null;
}

export interface Collection {
  id: string;
  name: string;
  description: string | null;
  game_count: number;
  cover_games: CollectionGame[];
  created_at: string;
  updated_at: string;
}

export interface CollectionDetail extends Collection {
  user_id?: string;
  username?: string | null;
  games: CollectionGame[];
}

export interface FeedPost {
  id: string;
  user_id: string;
  username: string | null;
  avatar_id: number;
  caption: string | null;
  created_at: string;
  post_type: 'library_entry' | 'collection';
  library_entry: LibraryEntry | null;
  collection: Collection | null;
  upvote_count: number;
  comment_count: number;
  upvoted_by_me: boolean;
}

export interface SteamAchievement {
  apiname: string;
  name: string;
  description: string | null;
  achieved: boolean;
  unlocktime: number;
  icon?: string | null;
  icongray?: string | null;
}

export interface SteamAchievementsResponse {
  owns_game: boolean;
  achievements: SteamAchievement[];
  total: number;
  unlocked_count: number;
}

export interface FeedComment {
  id: string;
  post_id: string;
  user_id: string;
  username: string | null;
  avatar_id: number;
  body: string;
  created_at: string;
}
