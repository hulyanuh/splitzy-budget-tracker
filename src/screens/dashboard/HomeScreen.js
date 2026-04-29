import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { Plus, TrendingUp, TrendingDown, LayoutGrid, Users, Receipt, ChevronRight, Wallet } from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import { supabase, TABLES } from '../../config/supabase';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../../config/theme';
import { formatCurrency } from '../../utils/splitCalculator';
import { Avatar, GlassCard, SectionHeader, LoadingScreen } from '../../components/UIComponents';
import { GroupCard, ExpenseCard } from '../../components/Cards';

export default function HomeScreen({ navigation }) {
  const { user, profile } = useAuth();
  const [groups,         setGroups]         = useState([]);
  const [recentExpenses, setRecentExpenses] = useState([]);
  const [totalOwed,      setTotalOwed]      = useState(0);
  const [totalOwing,     setTotalOwing]     = useState(0);
  const [loading,        setLoading]        = useState(true);
  const [refreshing,     setRefreshing]     = useState(false);

  useFocusEffect(useCallback(() => { loadData(); }, []));

  async function loadData() {
    try { await Promise.all([fetchGroups(), fetchRecentExpenses()]); }
    finally { setLoading(false); setRefreshing(false); }
  }

  async function fetchGroups() {
    const { data, error } = await supabase
      .from(TABLES.GROUP_MEMBERS)
      .select(`group:groups(id, name, emoji, created_at, members:group_members(count), expenses:expenses(count))`)
      .eq('user_id', user.id).limit(5);
    if (error) { console.error(error); return; }
    setGroups((data || []).map(d => ({
      ...d.group,
      member_count:  d.group?.members?.[0]?.count ?? 0,
      expense_count: d.group?.expenses?.[0]?.count ?? 0,
    })));
  }

  async function fetchRecentExpenses() {
    const { data: mg } = await supabase.from(TABLES.GROUP_MEMBERS).select('group_id').eq('user_id', user.id);
    if (!mg?.length) return;
    const { data, error } = await supabase
      .from(TABLES.EXPENSES)
      .select('*, splits:expense_splits(*), payer:users!paid_by(full_name)')
      .in('group_id', mg.map(g => g.group_id))
      .order('date', { ascending: false }).limit(5);
    if (error) { console.error(error); return; }
    const expenses = (data || []).map(e => ({ ...e, payer_name: e.payer?.full_name }));
    setRecentExpenses(expenses);
    let owed = 0, owing = 0;
    for (const exp of expenses) {
      if (exp.paid_by === user.id) owed += exp.splits?.filter(s => s.user_id !== user.id).reduce((a, s) => a + s.amount, 0) || 0;
      else owing += exp.splits?.find(s => s.user_id === user.id)?.amount || 0;
    }
    setTotalOwed(owed); setTotalOwing(owing);
  }

  if (loading) return <LoadingScreen message="Loading your dashboard..." />;
  const netBalance = totalOwed - totalOwing;

  return (
    <LinearGradient colors={['#2d1248', '#1f0d35']} style={styles.root}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} tintColor={COLORS.babyPink} />}
      >
        {/* Header */}
        <LinearGradient colors={['rgba(55,20,80,0.95)', 'transparent']} style={styles.topBar}>
          <View>
            <Text style={styles.greeting}>Good {getGreeting()}</Text>
            <Text style={styles.userName}>{profile?.full_name || 'Friend'}</Text>
          </View>
          <TouchableOpacity onPress={() => navigation.navigate('Settings')}>
            <Avatar name={profile?.full_name || ''} size={46} />
          </TouchableOpacity>
        </LinearGradient>

        {/* Hero Balance Card */}
        <LinearGradient
          colors={netBalance >= 0 ? ['#7b1fa2', '#ffadd0'] : ['#991b1b', '#dc2626']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={[styles.heroCard, SHADOWS.glow]}
        >
          <View style={styles.heroShimmer} />
          <View style={styles.heroIconRow}>
            <Wallet size={18} color="rgba(255,255,255,0.8)" />
            <Text style={styles.heroLabel}>  Net Balance</Text>
          </View>
          <Text style={styles.heroAmount}>{netBalance >= 0 ? '+' : ''}{formatCurrency(netBalance)}</Text>
          <Text style={styles.heroSub}>
            {netBalance >= 0
              ? `You're owed ${formatCurrency(totalOwed)} · You owe ${formatCurrency(totalOwing)}`
              : `You owe ${formatCurrency(totalOwing)} · Owed to you ${formatCurrency(totalOwed)}`}
          </Text>
          <View style={styles.heroDot} />
        </LinearGradient>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <StatPill icon={<TrendingUp size={18} color={COLORS.babyPink} />} label="Getting back" value={formatCurrency(totalOwed)} positive />
          <StatPill icon={<TrendingDown size={18} color="#f87171" />}        label="You owe"      value={formatCurrency(totalOwing)} />
        </View>

        {/* Quick Actions */}
        <View style={styles.actions}>
          <QuickAction icon={<Plus size={20} color={COLORS.babyPink} />}     label="New Group"   onPress={() => navigation.navigate('CreateGroup')} pink />
          <QuickAction icon={<Receipt size={20} color={COLORS.lavender} />}  label="Expenses"    onPress={() => navigation.navigate('GroupList')} />
          <QuickAction icon={<LayoutGrid size={20} color={COLORS.lavender}/>} label="Summary"    onPress={() => navigation.navigate('GroupList')} />
          <QuickAction icon={<Users size={20} color={COLORS.lavender} />}    label="Groups"      onPress={() => navigation.navigate('GroupList')} />
        </View>

        {/* Recent Groups */}
        <View style={styles.section}>
          <SectionHeader title="Recent Groups" action={() => navigation.navigate('GroupList')} actionLabel="See all" />
          {groups.length === 0 ? (
            <GlassCard style={styles.emptyCard}>
              <Text style={styles.emptyText}>No groups yet — create one to get started</Text>
            </GlassCard>
          ) : (
            groups.map(g => (
              <GroupCard key={g.id} group={g} onPress={() => navigation.navigate('GroupDetail', { groupId: g.id, groupName: g.name })} />
            ))
          )}
        </View>

        {/* Recent Expenses */}
        <View style={styles.section}>
          <SectionHeader title="Recent Expenses" action={() => navigation.navigate('GroupList')} actionLabel="See all" />
          {recentExpenses.length === 0 ? (
            <GlassCard style={styles.emptyCard}>
              <Text style={styles.emptyText}>No expenses yet — add one to a group</Text>
            </GlassCard>
          ) : (
            recentExpenses.map(e => (
              <ExpenseCard key={e.id} expense={e} currentUserId={user.id} onPress={() => navigation.navigate('ExpenseDetail', { expenseId: e.id })} />
            ))
          )}
        </View>

        <View style={{ height: SPACING[8] }} />
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity style={[styles.fab, SHADOWS.glow]} onPress={() => navigation.navigate('CreateGroup')}>
        <LinearGradient colors={['#9b59d0', '#ffadd0']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.fabGrad}>
          <Plus size={28} color="#fff" strokeWidth={2.5} />
        </LinearGradient>
      </TouchableOpacity>
    </LinearGradient>
  );
}

function StatPill({ icon, label, value, positive }) {
  return (
    <GlassCard style={[styles.statPill, positive && styles.statPillPink]}>
      {icon}
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, { color: positive ? COLORS.babyPink : '#f87171' }]}>{value}</Text>
    </GlassCard>
  );
}

function QuickAction({ icon, label, onPress, pink }) {
  return (
    <TouchableOpacity style={styles.qAction} onPress={onPress} activeOpacity={0.7}>
      <LinearGradient
        colors={pink ? ['#3d1550', '#2a0d40'] : ['#2a1040', '#1c0a32']}
        style={[styles.qActionBg, pink && styles.qActionBgPink]}
      >
        {icon}
        <Text style={[styles.qLabel, pink && { color: COLORS.babyPink }]}>{label}</Text>
      </LinearGradient>
    </TouchableOpacity>
  );
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 18) return 'afternoon';
  return 'evening';
}

const styles = StyleSheet.create({
  root:          { flex: 1 },
  topBar:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: SPACING[6], paddingTop: SPACING[12] },
  greeting:      { color: COLORS.blush, fontSize: FONTS.sizes.sm, fontWeight: '500' },
  userName:      { color: COLORS.white, fontSize: FONTS.sizes['2xl'], fontWeight: '800' },
  heroCard:      { margin: SPACING[5], borderRadius: RADIUS['2xl'], padding: SPACING[7], alignItems: 'center', overflow: 'hidden' },
  heroShimmer:   { position: 'absolute', top: 0, left: 0, right: 0, height: '50%', backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: RADIUS['2xl'] },
  heroDot:       { position: 'absolute', bottom: -20, right: -20, width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255,255,255,0.1)' },
  heroIconRow:   { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING[2] },
  heroLabel:     { color: 'rgba(255,255,255,0.85)', fontSize: FONTS.sizes.xs, fontWeight: '700', letterSpacing: 2, textTransform: 'uppercase' },
  heroAmount:    { color: COLORS.white, fontSize: FONTS.sizes['5xl'], fontWeight: '900', letterSpacing: -2 },
  heroSub:       { color: 'rgba(255,255,255,0.75)', fontSize: FONTS.sizes.sm, marginTop: SPACING[2], textAlign: 'center' },
  statsRow:      { flexDirection: 'row', gap: SPACING[3], paddingHorizontal: SPACING[5], marginBottom: SPACING[4] },
  statPill:      { flex: 1, alignItems: 'center', padding: SPACING[4], gap: 4 },
  statPillPink:  { borderColor: 'rgba(255,173,208,0.25)' },
  statLabel:     { color: COLORS.lavender, fontSize: FONTS.sizes.xs },
  statValue:     { fontSize: FONTS.sizes.lg, fontWeight: '800' },
  actions:       { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: SPACING[5], marginBottom: SPACING[5] },
  qAction:       { flex: 1, marginHorizontal: SPACING[1] },
  qActionBg:     { alignItems: 'center', padding: SPACING[3], borderRadius: RADIUS.lg, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)', gap: 6 },
  qActionBgPink: { borderColor: 'rgba(255,173,208,0.3)' },
  qLabel:        { color: COLORS.lavender, fontSize: 10, fontWeight: '600' },
  section:       { paddingHorizontal: SPACING[5], marginBottom: SPACING[5] },
  emptyCard:     { alignItems: 'center', padding: SPACING[5] },
  emptyText:     { color: COLORS.lavender, fontSize: FONTS.sizes.base },
  fab:           { position: 'absolute', bottom: SPACING[8], right: SPACING[6], width: 60, height: 60, borderRadius: 30 },
  fabGrad:       { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center' },
});
