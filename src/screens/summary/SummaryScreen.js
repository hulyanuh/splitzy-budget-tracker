import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../context/AuthContext';
import { supabase, TABLES, CATEGORIES } from '../../config/supabase';
import { COLORS, FONTS, SPACING, RADIUS } from '../../config/theme';
import {
  calculateGroupBalances,
  calculateMemberSummary,
  simplifyDebts,
  formatCurrency,
} from '../../utils/splitCalculator';
import { GlassCard, LoadingScreen, SectionHeader, Avatar } from '../../components/UIComponents';
import { BalanceCard } from '../../components/Cards';

export default function SummaryScreen({ route, navigation }) {
  const { groupId, groupName, members: initMembers } = route.params;
  const { user } = useAuth();

  const [expenses,     setExpenses]     = useState([]);
  const [members,      setMembers]      = useState(initMembers || []);
  const [memberSummary, setMemberSummary] = useState([]);
  const [debts,        setDebts]        = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [activeTab,    setActiveTab]    = useState('balances'); // balances | settle | categories

  useEffect(() => { loadData(); }, [groupId]);

  async function loadData() {
    try {
      // Fetch members if not passed
      let finalMembers = members;
      if (!finalMembers?.length) {
        const { data } = await supabase
          .from(TABLES.GROUP_MEMBERS)
          .select('user_id, user:users(id, full_name, email)')
          .eq('group_id', groupId);
        finalMembers = data || [];
        setMembers(finalMembers);
      }

      // Fetch all expenses with splits
      const { data: exps } = await supabase
        .from(TABLES.EXPENSES)
        .select('*, splits:expense_splits(*)')
        .eq('group_id', groupId);

      const expenses = exps || [];
      setExpenses(expenses);

      const memberIds = finalMembers.map(m => m.user_id);
      const bals      = calculateGroupBalances(expenses, memberIds);
      const summary   = calculateMemberSummary(expenses, finalMembers.map(m => ({
        ...m,
        ...(m.user || {}),
      })));
      const debtList  = simplifyDebts(bals);

      setMemberSummary(summary);
      setDebts(debtList);
    } finally {
      setLoading(false);
    }
  }

  // Category breakdown
  const categoryTotals = expenses.reduce((acc, e) => {
    acc[e.category] = (acc[e.category] || 0) + e.amount;
    return acc;
  }, {});
  const totalSpend = Object.values(categoryTotals).reduce((a, b) => a + b, 0);

  // Member map for debt display
  const memberMap = members.reduce((acc, m) => {
    acc[m.user_id] = m.user || m;
    return acc;
  }, {});

  if (loading) return <LoadingScreen message="Calculating balances..." />;

  return (
    <LinearGradient colors={COLORS.gradients.dark} style={styles.root}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{groupName}</Text>
        <Text style={styles.sub}>Group Summary</Text>
      </View>

      {/* ── Stats Row ── */}
      <View style={styles.statsRow}>
        <GlassCard style={styles.statCard}>
          <Text style={styles.statValue}>{formatCurrency(totalSpend)}</Text>
          <Text style={styles.statLabel}>Total Spend</Text>
        </GlassCard>
        <GlassCard style={styles.statCard}>
          <Text style={styles.statValue}>{expenses.length}</Text>
          <Text style={styles.statLabel}>Expenses</Text>
        </GlassCard>
        <GlassCard style={styles.statCard}>
          <Text style={styles.statValue}>{members.length}</Text>
          <Text style={styles.statLabel}>Members</Text>
        </GlassCard>
      </View>

      {/* ── Tabs ── */}
      <View style={styles.tabs}>
        {[
          { key: 'balances',   label: '⚖️ Balances' },
          { key: 'settle',     label: '💸 Settle Up' },
          { key: 'categories', label: '🏷️ Categories' },
        ].map(tab => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* ── BALANCES TAB ── */}
        {activeTab === 'balances' && (
          <>
            <SectionHeader title="Member Balances" />
            {memberSummary.map((m, i) => (
              <BalanceCard key={m.user_id || i} member={m} />
            ))}
          </>
        )}

        {/* ── SETTLE UP TAB ── */}
        {activeTab === 'settle' && (
          <>
            <SectionHeader title="Who Pays Whom" />
            {debts.length === 0 ? (
              <GlassCard style={styles.settledCard}>
                <Text style={styles.settledEmoji}>🎉</Text>
                <Text style={styles.settledTitle}>All settled up!</Text>
                <Text style={styles.settledSub}>No payments needed. Everyone's even.</Text>
              </GlassCard>
            ) : (
              debts.map((debt, i) => {
                const from = memberMap[debt.from] || {};
                const to   = memberMap[debt.to]   || {};
                return (
                  <GlassCard key={i} style={styles.debtCard}>
                    <View style={styles.debtRow}>
                      <View style={styles.debtPerson}>
                        <Avatar name={from.full_name || '?'} size={44} />
                        <Text style={styles.debtName} numberOfLines={1}>{from.full_name || 'Unknown'}</Text>
                      </View>
                      <View style={styles.debtMiddle}>
                        <Text style={styles.debtArrow}>→</Text>
                        <Text style={styles.debtAmt}>{formatCurrency(debt.amount)}</Text>
                        <Text style={styles.debtLabel}>pays</Text>
                      </View>
                      <View style={styles.debtPerson}>
                        <Avatar name={to.full_name || '?'} size={44} />
                        <Text style={styles.debtName} numberOfLines={1}>{to.full_name || 'Unknown'}</Text>
                      </View>
                    </View>
                  </GlassCard>
                );
              })
            )}
          </>
        )}

        {/* ── CATEGORIES TAB ── */}
        {activeTab === 'categories' && (
          <>
            <SectionHeader title="Spending by Category" />
            {Object.entries(categoryTotals)
              .sort((a, b) => b[1] - a[1])
              .map(([catId, total]) => {
                const cat = CATEGORIES.find(c => c.id === catId) || CATEGORIES[CATEGORIES.length - 1];
                const pct = totalSpend > 0 ? (total / totalSpend) * 100 : 0;
                return (
                  <GlassCard key={catId} style={styles.catCard}>
                    <View style={styles.catRow}>
                      <View style={[styles.catIcon, { backgroundColor: cat.color + '22' }]}>
                        <Text style={styles.catEmoji}>{cat.icon}</Text>
                      </View>
                      <View style={styles.catInfo}>
                        <Text style={styles.catName}>{cat.label}</Text>
                        <View style={styles.progressTrack}>
                          <View style={[styles.progressFill, { width: `${pct}%`, backgroundColor: cat.color }]} />
                        </View>
                      </View>
                      <View style={styles.catRight}>
                        <Text style={styles.catAmt}>{formatCurrency(total)}</Text>
                        <Text style={styles.catPct}>{pct.toFixed(0)}%</Text>
                      </View>
                    </View>
                  </GlassCard>
                );
              })}
          </>
        )}

        <View style={{ height: SPACING[8] }} />
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root:    { flex: 1 },
  header:  { padding: SPACING[6], paddingTop: SPACING[12] },
  backText:{ color: COLORS.purple[300], fontSize: FONTS.sizes.base, fontWeight: '600', marginBottom: SPACING[3] },
  title:   { color: COLORS.white, fontSize: FONTS.sizes['2xl'], fontWeight: '900' },
  sub:     { color: COLORS.text.muted, fontSize: FONTS.sizes.sm, marginTop: 2 },
  statsRow:{ flexDirection: 'row', gap: SPACING[3], paddingHorizontal: SPACING[5], marginBottom: SPACING[4] },
  statCard:{ flex: 1, alignItems: 'center', padding: SPACING[4] },
  statValue:{ color: COLORS.white, fontSize: FONTS.sizes.xl, fontWeight: '900' },
  statLabel:{ color: COLORS.text.muted, fontSize: FONTS.sizes.xs, marginTop: 4 },
  tabs:    { flexDirection: 'row', paddingHorizontal: SPACING[5], marginBottom: SPACING[4], gap: SPACING[2] },
  tab:     { flex: 1, paddingVertical: SPACING[2] + 2, alignItems: 'center', borderRadius: RADIUS.md, backgroundColor: COLORS.background.card, borderWidth: 1, borderColor: 'transparent' },
  tabActive:{ borderColor: COLORS.purple[500], backgroundColor: COLORS.purple[900] + '66' },
  tabText: { color: COLORS.text.muted, fontSize: 11, fontWeight: '600' },
  tabTextActive: { color: COLORS.purple[300] },
  scroll:  { paddingHorizontal: SPACING[5] },
  settledCard: { alignItems: 'center', padding: SPACING[8] },
  settledEmoji:{ fontSize: 56, marginBottom: SPACING[4] },
  settledTitle:{ color: COLORS.white, fontSize: FONTS.sizes.xl, fontWeight: '800' },
  settledSub:  { color: COLORS.text.muted, fontSize: FONTS.sizes.base, marginTop: SPACING[2], textAlign: 'center' },
  debtCard:{ marginBottom: SPACING[3] },
  debtRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  debtPerson: { alignItems: 'center', width: 80 },
  debtName:   { color: COLORS.text.secondary, fontSize: FONTS.sizes.xs, marginTop: SPACING[1], textAlign: 'center' },
  debtMiddle: { alignItems: 'center', flex: 1 },
  debtArrow:  { color: COLORS.purple[400], fontSize: 28 },
  debtAmt:    { color: COLORS.white, fontSize: FONTS.sizes.lg, fontWeight: '900' },
  debtLabel:  { color: COLORS.text.muted, fontSize: FONTS.sizes.xs },
  catCard: { marginBottom: SPACING[3] },
  catRow:  { flexDirection: 'row', alignItems: 'center', gap: SPACING[3] },
  catIcon: { width: 44, height: 44, borderRadius: RADIUS.md, alignItems: 'center', justifyContent: 'center' },
  catEmoji:{ fontSize: 22 },
  catInfo: { flex: 1 },
  catName: { color: COLORS.text.primary, fontSize: FONTS.sizes.base, fontWeight: '600', marginBottom: SPACING[2] },
  progressTrack: { height: 6, backgroundColor: COLORS.background.elevated, borderRadius: 3, overflow: 'hidden' },
  progressFill:  { height: 6, borderRadius: 3 },
  catRight:{ alignItems: 'flex-end' },
  catAmt:  { color: COLORS.white, fontSize: FONTS.sizes.base, fontWeight: '700' },
  catPct:  { color: COLORS.text.muted, fontSize: FONTS.sizes.xs, marginTop: 2 },
});
