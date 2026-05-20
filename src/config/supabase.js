import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ─────────────────────────────────────────────────────────────────────────────
// 🔧 CONFIGURATION — Replace with your Supabase project credentials
// ─────────────────────────────────────────────────────────────────────────────
const SUPABASE_URL = 'https://dyvuvofqsycdeqvmzdzm.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR5dnV2b2Zxc3ljZGVxdm16ZHptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzczNjU5NzcsImV4cCI6MjA5Mjk0MTk3N30.udOePhThiIUjk7l-dgn3VGv8_fKMy2kmW9OiA_aeZYc'

import fetch from 'cross-fetch';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
  global: {
    fetch: fetch,
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// 📦 TABLE NAMES
// ─────────────────────────────────────────────────────────────────────────────
export const TABLES = {
  USERS: 'users',
  GROUPS: 'groups',
  GROUP_MEMBERS: 'group_members',
  EXPENSES: 'expenses',
  EXPENSE_SPLITS: 'expense_splits',
};

// ─────────────────────────────────────────────────────────────────────────────
// 🏷️ EXPENSE CATEGORIES
// ─────────────────────────────────────────────────────────────────────────────
export const CATEGORIES = [
  { id: 'food', label: 'Food & Drinks', color: '#FF6B6B' },
  { id: 'transport', label: 'Transport', color: '#4ECDC4' },
  { id: 'accommodation', label: 'Accommodation', color: '#45B7D1' },
  { id: 'entertainment', label: 'Entertainment', color: '#96CEB4' },
  { id: 'shopping', label: 'Shopping', color: '#FFEAA7' },
  { id: 'utilities', label: 'Utilities', color: '#DDA0DD' },
  { id: 'health', label: 'Health', color: '#98D8C8' },
  { id: 'others', label: 'Others', color: '#B0B0B0' },
];

// ─────────────────────────────────────────────────────────────────────────────
// 🎨 SPLIT TYPES
// ─────────────────────────────────────────────────────────────────────────────
export const SPLIT_TYPES = {
  EQUAL: 'equal',
  CUSTOM: 'custom',
  PERCENTAGE: 'percentage',
};
