import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { ArrowLeft, Receipt } from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import { supabase, TABLES } from '../../config/supabase';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../../config/theme';
import { LoadingScreen, GlassCard } from '../../components/UIComponents';
import { ExpenseCard } from '../../components/Cards';

export default function GlobalExpenseListScreen({ navigation }) {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(useCallback(() => { loadData(); }, []));

  async function loadData() {
    try {
      const { data: mg } = await supabase.from(TABLES.GROUP_MEMBERS).select('group_id').eq('user_id', user.id);
      if (!mg?.length) return;

      const { data, error } = await supabase
        .from(TABLES.EXPENSES)
        .select('*, splits:expense_splits(*), group:groups(name)')
        .in('group_id', mg.map(g => g.group_id))
        .order('date', { ascending: false });
        
      if (error) { console.error(error); return; }
      
      const payerIds = [...new Set((data || []).map(e => e.paid_by))];
      const { data: usersData } = await supabase.from(TABLES.USERS).select('id, full_name').in('id', payerIds);
      const usersMap = Object.fromEntries((usersData || []).map(u => [u.id, u.full_name]));

      setExpenses((data || []).map(e => ({ ...e, payer_name: usersMap[e.paid_by] })));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  if (loading) return <LoadingScreen message="Loading expenses..." />;

  return (
    <LinearGradient colors={['#1e0a30', '#130520']} style={styles.root}>
      {/* Header */}
      <LinearGradient colors={['rgba(45,16,64,0.95)', 'transparent']} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ArrowLeft size={22} color={COLORS.white} strokeWidth={2} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>All Expenses</Text>
        <View style={{ width: 40 }} />
      </LinearGradient>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} tintColor={COLORS.babyPink} />}
      >
        {expenses.length === 0 ? (
          <GlassCard style={styles.emptyCard}>
            <Receipt size={40} color={COLORS.lavender} strokeWidth={1.5} />
            <Text style={styles.emptyTitle}>No expenses found</Text>
            <Text style={styles.emptyText}>You don't have any expenses in your groups yet.</Text>
          </GlassCard>
        ) : (
          expenses.map(e => (
            <View key={e.id} style={{ marginBottom: SPACING[3] }}>
              <Text style={styles.groupLabel}>{e.group?.name}</Text>
              <ExpenseCard expense={e} currentUserId={user.id} onPress={() => navigation.navigate('ExpenseDetail', { expenseId: e.id })} />
            </View>
          ))
        )}
        <View style={{ height: SPACING[10] }} />
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root:        { flex: 1 },
  header:      { flexDirection: 'row', alignItems: 'center', padding: SPACING[5], paddingTop: SPACING[12] },
  backBtn:     { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, color: COLORS.white, fontSize: FONTS.sizes.lg, fontWeight: '800', textAlign: 'center' },
  scroll:      { padding: SPACING[5] },
  groupLabel:  { color: COLORS.lavender, fontSize: FONTS.sizes.xs, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginBottom: SPACING[2], marginLeft: SPACING[1] },
  emptyCard:   { alignItems: 'center', padding: SPACING[8], gap: SPACING[3], marginTop: SPACING[10] },
  emptyTitle:  { color: COLORS.white,    fontSize: FONTS.sizes.lg, fontWeight: '700' },
  emptyText:   { color: COLORS.lavender, fontSize: FONTS.sizes.base, textAlign: 'center' },
});
