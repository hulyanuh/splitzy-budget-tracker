import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ─────────────────────────────────────────────────────────────────────────────
// 🔧 CONFIGURATION — Replace with your Supabase project credentials
// ─────────────────────────────────────────────────────────────────────────────
const SUPABASE_URL = 'https://dyvuvofqsycdeqvmzdzm.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR5dnV2b2Zxc3ljZGVxdm16ZHptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzczNjU5NzcsImV4cCI6MjA5Mjk0MTk3N30.udOePhThiIUjk7l-dgn3VGv8_fKMy2kmW9OiA_aeZYc';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
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
  { id: 'food', label: 'Food & Drinks', icon: '🍔', color: '#FF6B6B' },
  { id: 'transport', label: 'Transport', icon: '🚗', color: '#4ECDC4' },
  { id: 'accommodation', label: 'Accommodation', icon: '🏠', color: '#45B7D1' },
  { id: 'entertainment', label: 'Entertainment', icon: '🎭', color: '#96CEB4' },
  { id: 'shopping', label: 'Shopping', icon: '🛍️', color: '#FFEAA7' },
  { id: 'utilities', label: 'Utilities', icon: '⚡', color: '#DDA0DD' },
  { id: 'health', label: 'Health', icon: '💊', color: '#98D8C8' },
  { id: 'others', label: 'Others', icon: '📦', color: '#B0B0B0' },
];

// ─────────────────────────────────────────────────────────────────────────────
// 🎨 SPLIT TYPES
// ─────────────────────────────────────────────────────────────────────────────
export const SPLIT_TYPES = {
  EQUAL: 'equal',
  CUSTOM: 'custom',
  PERCENTAGE: 'percentage',
};
