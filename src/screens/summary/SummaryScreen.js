import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, Scale, ArrowRight, BarChart3 } from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import { supabase, TABLES, CATEGORIES } from '../../config/supabase';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../../config/theme';
import { LoadingScreen, GlassCard } from '../../components/UIComponents';
import { BalanceCard, TransactionRow } from '../../components/Cards';
import { calculateGroupBalances, simplifyDebts, formatCurrency } from '../../utils/splitCalculator';

export default function SummaryScreen({ route, navigation }) {
  const { groupId } = route.params || {};
  const { user } = useAuth();
  const [tab,      setTab]      = useState('balances');
  const [members,  setMembers]  = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    const [{ data: mData }, { data: eData }] = await Promise.all([
      supabase.from(TABLES.GROUP_MEMBERS).select('*, user:users(id, full_name, email)').eq('group_id', groupId),
      supabase.from(TABLES.EXPENSES).select('*, splits:expense_splits(*)').eq('group_id', groupId),
    ]);
    setMembers((mData || []).map(m => ({ ...m.user })));
    setExpenses(eData || []);
    setLoading(false);
  }

  if (loading) return <LoadingScreen message="Calculating balances..." />;

  const balances      = calculateGroupBalances(members, expenses);
  const transactions  = simplifyDebts(balances);
  const memberMap     = Object.fromEntries(members.map(m => [m.id, m]));

  const categoryTotals = CATEGORIES.map(c => {
    const total = expenses.filter(e => e.category === c.id).reduce((a, e) => a + e.amount, 0);
    return { ...c, total };
  }).filter(c => c.total > 0).sort((a, b) => b.total - a.total);
  const grandTotal = categoryTotals.reduce((a, c) => a + c.total, 0);

  const tabs = [
    { id: 'balances',     label: 'Balances',   icon: <Scale size={14} color={tab === 'balances'     ? COLORS.babyPink : COLORS.lavender} strokeWidth={2} /> },
    { id: 'settle',       label: 'Settle Up',  icon: <ArrowRight size={14} color={tab === 'settle'   ? COLORS.babyPink : COLORS.lavender} strokeWidth={2} /> },
    { id: 'categories',   label: 'Categories', icon: <BarChart3 size={14} color={tab === 'categories'? COLORS.babyPink : COLORS.lavender} strokeWidth={2} /> },
  ];

  return (
    <LinearGradient colors={['#1e0a30', '#130520']} style={styles.root}>
      <LinearGradient colors={['rgba(45,16,64,0.95)', 'transparent']} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ArrowLeft size={22} color={COLORS.white} strokeWidth={2} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Summary</Text>
        <View style={{ width: 40 }} />
      </LinearGradient>

      {/* Tabs */}
      <View style={styles.tabBar}>
        {tabs.map(t => (
          <TouchableOpacity key={t.id} onPress={() => setTab(t.id)}
            style={[styles.tab, tab === t.id && styles.tabActive]}>
            {t.icon}
            <Text style={[styles.tabText, tab === t.id && styles.tabTextActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {tab === 'balances' && balances.map(m => (
          <BalanceCard key={m.id} member={m} />
        ))}

        {tab === 'settle' && (
          transactions.length === 0 ? (
            <GlassCard style={styles.emptyCard}>
              <Scale size={32} color={COLORS.babyPink} strokeWidth={1.5} />
              <Text style={styles.emptyTitle}>All settled up!</Text>
              <Text style={styles.emptyText}>No payments needed</Text>
            </GlassCard>
          ) : (
            transactions.map((t, i) => <TransactionRow key={i} transaction={t} memberMap={memberMap} />)
          )
        )}

        {tab === 'categories' && (
          <>
            <GlassCard style={styles.totalCard}>
              <Text style={styles.totalLabel}>Total Spent</Text>
              <Text style={styles.totalAmount}>{formatCurrency(grandTotal)}</Text>
            </GlassCard>
            {categoryTotals.map(c => (
              <GlassCard key={c.id} style={styles.catCard}>
                <View style={styles.catRow}>
                  <View style={[styles.catDot, { backgroundColor: c.color }]} />
                  <Text style={styles.catName}>{c.label}</Text>
                  <Text style={styles.catAmount}>{formatCurrency(c.total)}</Text>
                  <Text style={styles.catPct}>{grandTotal > 0 ? ((c.total / grandTotal) * 100).toFixed(0) : 0}%</Text>
                </View>
                <View style={styles.progressBg}>
                  <View style={[styles.progressFill, { width: `${grandTotal > 0 ? (c.total / grandTotal) * 100 : 0}%`, backgroundColor: c.color }]} />
                </View>
              </GlassCard>
            ))}
          </>
        )}

        <View style={{ height: SPACING[8] }} />
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root:        { flex: 1 },
  header:      { flexDirection: 'row', alignItems: 'center', padding: SPACING[5], paddingTop: SPACING[12] },
  backBtn:     { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, color: COLORS.white, fontSize: FONTS.sizes.lg, fontWeight: '800', textAlign: 'center' },
  tabBar:      { flexDirection: 'row', marginHorizontal: SPACING[5], marginBottom: SPACING[4], backgroundColor: COLORS.background.card, borderRadius: RADIUS.xl, padding: SPACING[1], borderWidth: 1, borderColor: 'rgba(255,173,208,0.15)' },
  tab:         { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: SPACING[3], borderRadius: RADIUS.lg },
  tabActive:   { backgroundColor: 'rgba(255,173,208,0.15)' },
  tabText:     { color: COLORS.lavender, fontSize: FONTS.sizes.xs, fontWeight: '600' },
  tabTextActive:{ color: COLORS.babyPink, fontWeight: '700' },
  scroll:      { padding: SPACING[5], paddingTop: 0, gap: SPACING[3] },
  emptyCard:   { alignItems: 'center', padding: SPACING[8], gap: SPACING[3] },
  emptyTitle:  { color: COLORS.white,    fontSize: FONTS.sizes.lg, fontWeight: '700' },
  emptyText:   { color: COLORS.lavender, fontSize: FONTS.sizes.base },
  totalCard:   { alignItems: 'center', padding: SPACING[5] },
  totalLabel:  { color: COLORS.lavender, fontSize: FONTS.sizes.sm, marginBottom: 4 },
  totalAmount: { color: COLORS.white, fontSize: FONTS.sizes['3xl'], fontWeight: '900' },
  catCard:     { gap: SPACING[3] },
  catRow:      { flexDirection: 'row', alignItems: 'center', gap: SPACING[3] },
  catDot:      { width: 10, height: 10, borderRadius: 5 },
  catName:     { flex: 1, color: COLORS.white, fontSize: FONTS.sizes.sm, fontWeight: '600' },
  catAmount:   { color: COLORS.white, fontSize: FONTS.sizes.sm, fontWeight: '700' },
  catPct:      { color: COLORS.lavender, fontSize: FONTS.sizes.xs, width: 32, textAlign: 'right' },
  progressBg:  { height: 6, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 3, overflow: 'hidden' },
  progressFill:{ height: '100%', borderRadius: 3 },
});
