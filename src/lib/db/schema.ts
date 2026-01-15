import { pgTable, text, serial, jsonb, timestamp } from 'drizzle-orm/pg-core';
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

// Chats table - stores chat sessions
// userId references Neon Auth's user ID (not a local users table)
export const chats = pgTable('chats', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(), // References Neon Auth user ID
  title: text('title').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  sources: jsonb('sources').$type<SearchSources[]>().default([]),
  files: jsonb('files').$type<DBFile[]>().default([]),
});

// Admin settings - global configuration stored in database
// Uses a single row with key 'global' for app-wide settings
export interface AdminSettingsData {
  allowedChatModels?: string[]; // Format: "providerId/modelKey"
}

export const adminSettings = pgTable('admin_settings', {
  key: text('key').primaryKey().default('global'),
  settings: jsonb('settings').$type<AdminSettingsData>().default({}),
  updatedAt: timestamp('updated_at').defaultNow(),
});
