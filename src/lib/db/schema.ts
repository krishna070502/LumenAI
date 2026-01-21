import { pgTable, text, serial, jsonb, timestamp, integer, vector } from 'drizzle-orm/pg-core';
import { Block } from '../types';
import { SearchSources } from '../agents/search/types';

interface DBFile {
  name: string;
  fileId: string;
}

// User preferences - stored per user for personalized settings
export interface UserPreferencesData {
  theme?: 'light' | 'dark';
  measureUnit?: 'Metric' | 'Imperial';
  autoMediaSearch?: boolean;
  showWeatherWidget?: boolean;
  showNewsWidget?: boolean;
  memoryEnabled?: boolean; // Controls if RAG/personalization memory is active
}

export interface UserPersonalizationData {
  systemInstructions?: string;
}

export const userPreferences = pgTable('user_preferences', {
  userId: text('user_id').primaryKey(), // References Neon Auth user ID
  preferences: jsonb('preferences').$type<UserPreferencesData>().default({}),
  personalization: jsonb('personalization').$type<UserPersonalizationData>().default({}),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Messages table - stores individual chat messages
// userId references Neon Auth's user ID (not a local users table)
export const messages = pgTable('messages', {
  id: serial('id').primaryKey(),
  messageId: text('message_id').notNull(),
  chatId: text('chat_id').notNull(),
  userId: text('user_id').notNull(), // References Neon Auth user ID
  backendId: text('backend_id').notNull(),
  query: text('query').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  responseBlocks: jsonb('response_blocks').$type<Block[]>().default([]),
  status: text('status').$type<'answering' | 'completed' | 'error'>().default('answering'),
});

// Space settings interface
export interface SpaceSettings {
  aiSuggestionsEnabled?: boolean; // Controls if AI auto-suggestions are enabled in docs
}

// Spaces table - personalized workspaces for specific tasks
export const spaces = pgTable('spaces', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(), // References Neon Auth user ID
  name: text('name').notNull(),
  description: text('description'),
  icon: text('icon'), // Emoji or icon identifier
  systemPrompt: text('system_prompt'), // Custom AI persona for this space
  settings: jsonb('settings').$type<SpaceSettings>().default({}), // Space-specific settings
  createdAt: timestamp('created_at').defaultNow(),
});

// Chats table - stores chat sessions
// userId references Neon Auth's user ID (not a local users table)
export const chats = pgTable('chats', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(), // References Neon Auth user ID
  title: text('title').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  sources: jsonb('sources').$type<SearchSources[]>().default([]),
  files: jsonb('files').$type<DBFile[]>().default([]),
  chatMode: text('chat_mode').$type<'chat' | 'research'>().default('chat'),
  spaceId: text('space_id'), // Optional - null for regular chats, set for space chats
});

// Admin settings - global configuration stored in database
// Uses a single row with key 'global' for app-wide settings
export interface AdminSettingsData {
  allowedChatModels?: string[]; // Format: "providerId/modelKey"
  guestChatLimit?: number; // Max messages for non-logged-in users in Chat mode
  guestResearchLimit?: number; // Max messages for non-logged-in users in Research mode
  guestLimitPeriod?: 'session' | 'daily'; // How often the limit resets
}

export const adminSettings = pgTable('admin_settings', {
  key: text('key').primaryKey().default('global'),
  settings: jsonb('settings').$type<AdminSettingsData>().default({}),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Memories table - stores user-specific long-term facts
export const memories = pgTable('memories', {
  id: serial('id').primaryKey(),
  userId: text('user_id').notNull(),
  content: text('content').notNull(),
  embedding: vector('embedding', { dimensions: 1536 }),
  metadata: jsonb('metadata').default({}),
  importance: integer('importance').default(1), // 1-5 scale
  lastAccessedAt: timestamp('last_accessed_at').defaultNow(),
  createdAt: timestamp('created_at').defaultNow(),
});

// Saved articles table - stores user bookmarked articles
export const savedArticles = pgTable('saved_articles', {
  id: serial('id').primaryKey(),
  userId: text('user_id').notNull(),
  url: text('url').notNull(),
  title: text('title').notNull(),
  thumbnail: text('thumbnail'),
  source: text('source'),
  savedAt: timestamp('saved_at').defaultNow(),
});

// Documents table - stores rich text documents within spaces
export const documents = pgTable('documents', {
  id: text('id').primaryKey(),
  spaceId: text('space_id').notNull(),
  userId: text('user_id').notNull(),
  title: text('title').notNull(),
  content: jsonb('content'), // Tiptap JSON format
  plainText: text('plain_text'), // For search
  aiChatHistory: jsonb('ai_chat_history').$type<{ role: 'user' | 'assistant', content: string }[]>().default([]), // LumenAI chat messages
  isPublic: text('is_public').$type<'true' | 'false'>().default('false'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Document shares table - for sharing documents with others
export const documentShares = pgTable('document_shares', {
  id: serial('id').primaryKey(),
  documentId: text('document_id').notNull(),
  sharedWithUserId: text('shared_with_user_id'), // Null for public link sharing
  shareLink: text('share_link'), // Unique share link
  permission: text('permission').$type<'view' | 'edit'>().default('view'),
  createdAt: timestamp('created_at').defaultNow(),
});
