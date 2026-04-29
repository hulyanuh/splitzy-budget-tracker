import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { supabase, TABLES } from '../../config/supabase';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../../config/theme';
import { formatCurrency, calculateGroupBalances, simplifyDebts } from '../../utils/splitCalculator';
import { GradientButton, OutlineButton, SectionHeader, LoadingScreen, Avatar, GlassCard } from '../../components/UIComponents';
import { ExpenseCard, BalanceCard } from '../../components/Cards';

export default function GroupDetailScreen({ route, navigation }) {
  const { groupId, groupName } = route.params;
  const { user } = useAuth();

  const [group,      setGroup]      = useState(null);
  const [members,    setMembers]    = useState([]);
  const [expenses,   setExpenses]   = useState([]);
  const [balances,   setBalances]   = useState({});
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(useCallback(() => { loadAll(); }, [groupId]));

  async function loadAll() {
    try {
      await Promise.all([fetchGroup(), fetchExpenses()]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function fetchGroup() {
    const { data, error } = await supabase
      .from(TABLES.GROUPS)
      .select(`
        *,
        members:group_members(
          user_id, role,
          user:users(id, full_name, email)
        )
      `)
      .eq('id', groupId)
      .single();

    if (error) throw error;
    setGroup(data);
    setMembers(data.members || []);
  }

  async function fetchExpenses() {
    const { data, error } = await supabase
      .from(TABLES.EXPENSES)
      .select(`
        *,
        splits:expense_splits(*),
        payer:users!paid_by(full_name)
      `)
      .eq('group_id', groupId)
      .order('date', { ascending: false });

    if (error) throw error;
    const exps = (data || []).map(e => ({ ...e, payer_name: e.payer?.full_name }));
    setExpenses(exps);

    // Calculate balances
    const memberIds = (members.length > 0 ? members : []).map(m => m.user_id);
    const bals = calculateGroupBalances(exps, memberIds);
    setBalances(bals);
  }

  async function deleteGroup() {
    Alert.alert('Delete Group', `Are you sure you want to delete "${groupName}"? This will delete all expenses.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await supabase.from(TABLES.EXPENSE_SPLITS).delete().in(
              'expense_id',
              expenses.map(e => e.id),
            );
            await supabase.from(TABLES.EXPENSES).delete().eq('group_id', groupId);
            await supabase.from(TABLES.GROUP_MEMBERS).delete().eq('group_id', groupId);
            await supabase.from(TABLES.GROUPS).delete().eq('id', groupId);
            navigation.goBack();
          } catch (err) {
            Alert.alert('Error', err.message);
          }
        },
      },
    ]);
  }

  const totalSpend   = expenses.reduce((a, e) => a + e.amount, 0);
  const myBalance    = balances[user.id] ?? 0;
  const isOwner      = group?.created_by === user.id;

  if (loading) return <LoadingScreen message="Loading group..." />;

  return (
    <LinearGradient colors={COLORS.gradients.dark} style={styles.root}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); loadAll(); }}
            tintColor={COLORS.purple[400]}
          />
        }
      >
        {/* ── Hero ── */}
        <LinearGradient
          colors={COLORS.gradients.primary}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.emoji}>{group?.emoji || '👥'}</Text>
          <Text style={styles.groupName}>{group?.name || groupName}</Text>
          {group?.description && <Text style={styles.groupDesc}>{group.description}</Text>}
          <Text style={styles.memberBadge}>{members.length} members</Text>
        </LinearGradient>

        {/* ── Balance snapshot ── */}
        <View style={styles.balanceRow}>
          <GlassCard style={[styles.balCard, { borderColor: myBalance >= 0 ? COLORS.status.success + '44' : COLORS.status.error + '44' }]}>
            <Text style={styles.balLabel}>Your balance</Text>
            <Text style={[styles.balAmount, { color: myBalance >= 0 ? COLORS.status.success : COLORS.status.error }]}>
              {myBalance >= 0 ? '+' : ''}{formatCurrency(myBalance)}
            </Text>
            <Text style={styles.balSub}>{myBalance >= 0 ? 'You get back' : 'You owe'}</Text>
          </GlassCard>
          <GlassCard style={styles.balCard}>
            <Text style={styles.balLabel}>Total spend</Text>
            <Text style={styles.totalAmt}>{formatCurrency(totalSpend)}</Text>
            <Text style={styles.balSub}>{expenses.length} expenses</Text>
          </GlassCard>
        </View>

        {/* ── Action Buttons ── */}
        <View style={styles.actions}>
          <GradientButton
            title="Add Expense"
            icon="💸"
            onPress={() => navigation.navigate('AddExpense', { groupId, members, groupName })}
            style={{ flex: 1 }}
          />
          <GradientButton
            title="Summary"
            icon="📊"
            variant="secondary"
            onPress={() => navigation.navigate('Summary', { groupId, groupName, members })}
            style={{ flex: 1 }}
          />
        </View>

        {/* ── Members ── */}
        <View style={styles.section}>
          <SectionHeader
            title="Members"
            action={isOwner ? () => navigation.navigate('EditGroup', { groupId, group, members }) : null}
            actionLabel="Manage"
          />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.memberScroll}>
            {members.map(m => (
              <View key={m.user_id} style={styles.memberPill}>
                <Avatar name={m.user?.full_name || ''} size={48} />
                <Text style={styles.memberName} numberOfLines={1}>
                  {m.user?.full_name?.split(' ')[0] || 'Unknown'}
                </Text>
                {m.user_id === user.id && <Text style={styles.youTag}>You</Text>}
              </View>
            ))}
          </ScrollView>
        </View>

        {/* ── Expenses ── */}
        <View style={styles.section}>
          <SectionHeader title="Expenses" />
          {expenses.length === 0 ? (
            <GlassCard style={styles.emptyCard}>
              <Text style={styles.emptyText}>No expenses yet. Add one! 💸</Text>
            </GlassCard>
          ) : (
            expenses.map(e => (
              <ExpenseCard
                key={e.id}
                expense={e}
                currentUserId={user.id}
                onPress={() => navigation.navigate('ExpenseDetail', { expenseId: e.id, groupId, members })}
              />
            ))
          )}
        </View>

        {/* ── Danger Zone ── */}
        {isOwner && (
          <View style={styles.section}>
            <OutlineButton
              title="Delete Group"
              variant="danger"
              icon="🗑️"
              onPress={deleteGroup}
            />
          </View>
        )}

        <View style={{ height: SPACING[8] }} />
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root:   { flex: 1 },
  hero:   { padding: SPACING[6], paddingTop: SPACING[12], alignItems: 'center' },
  backBtn:{ alignSelf: 'flex-start', marginBottom: SPACING[4] },
  backText: { color: 'rgba(255,255,255,0.8)', fontSize: FONTS.sizes.base, fontWeight: '600' },
  emoji:   { fontSize: 56, marginBottom: SPACING[2] },
  groupName: { color: COLORS.white, fontSize: FONTS.sizes['2xl'], fontWeight: '900', textAlign: 'center' },
  groupDesc: { color: 'rgba(255,255,255,0.7)', fontSize: FONTS.sizes.sm, marginTop: SPACING[1], textAlign: 'center' },
  memberBadge: { color: 'rgba(255,255,255,0.6)', fontSize: FONTS.sizes.xs, marginTop: SPACING[2], backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: SPACING[3], paddingVertical: 4, borderRadius: RADIUS.full },
  balanceRow: { flexDirection: 'row', gap: SPACING[3], padding: SPACING[5] },
  balCard:    { flex: 1, alignItems: 'center', padding: SPACING[4] },
  balLabel:   { color: COLORS.text.muted, fontSize: FONTS.sizes.xs, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  balAmount:  { fontSize: FONTS.sizes['2xl'], fontWeight: '900', marginTop: 4 },
  totalAmt:   { color: COLORS.white, fontSize: FONTS.sizes['2xl'], fontWeight: '900', marginTop: 4 },
  balSub:     { color: COLORS.text.muted, fontSize: FONTS.sizes.xs, marginTop: 2 },
  actions:    { flexDirection: 'row', gap: SPACING[3], paddingHorizontal: SPACING[5], marginBottom: SPACING[4] },
  section:    { paddingHorizontal: SPACING[5], marginBottom: SPACING[5] },
  memberScroll: { paddingVertical: SPACING[2] },
  memberPill: { alignItems: 'center', marginRight: SPACING[4], width: 64 },
  memberName: { color: COLORS.text.secondary, fontSize: FONTS.sizes.xs, marginTop: SPACING[2], textAlign: 'center' },
  youTag:     { color: COLORS.purple[300], fontSize: 9, fontWeight: '700', backgroundColor: COLORS.purple[900], paddingHorizontal: 6, paddingVertical: 2, borderRadius: RADIUS.full, marginTop: 2 },
  emptyCard:  { alignItems: 'center', padding: SPACING[6] },
  emptyText:  { color: COLORS.text.muted, fontSize: FONTS.sizes.base },
});
