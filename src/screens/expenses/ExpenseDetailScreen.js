import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, Pencil, Trash2, CreditCard, CalendarDays, StickyNote, SplitSquareHorizontal, CheckCircle } from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import { supabase, TABLES, CATEGORIES } from '../../config/supabase';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../../config/theme';
import { LoadingScreen, GlassCard, Avatar } from '../../components/UIComponents';
import { formatCurrency } from '../../utils/splitCalculator';

export default function ExpenseDetailScreen({ route, navigation }) {
  const { expenseId } = route.params;
  const { user } = useAuth();
  const [expense, setExpense] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchExpense(); }, []);

  async function fetchExpense() {
    const { data } = await supabase
      .from(TABLES.EXPENSES)
      .select('*, splits:expense_splits(*, user:users(id, full_name)), payer:users!paid_by(full_name)')
      .eq('id', expenseId)
      .single();
    setExpense(data);
    setLoading(false);
  }

  async function handleDelete() {
    Alert.alert('Delete Expense', 'This will permanently delete this expense.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        await supabase.from(TABLES.EXPENSE_SPLITS).delete().eq('expense_id', expenseId);
        await supabase.from(TABLES.EXPENSES).delete().eq('id', expenseId);
        navigation.goBack();
      }},
    ]);
  }

  if (loading || !expense) return <LoadingScreen message="Loading expense..." />;

  const category = CATEGORIES.find(c => c.id === expense.category) || CATEGORIES[CATEGORIES.length - 1];
  const isPayer  = expense.paid_by === user.id;
  const myShare  = expense.splits?.find(s => s.user_id === user.id)?.amount ?? 0;

  return (
    <LinearGradient colors={['#1e0a30', '#130520']} style={styles.root}>
      {/* Header */}
      <LinearGradient colors={['rgba(45,16,64,0.95)', 'transparent']} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ArrowLeft size={22} color={COLORS.white} strokeWidth={2} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Expense Detail</Text>
        <View style={styles.headerActions}>
          {isPayer && (
            <>
              <TouchableOpacity
                onPress={() => navigation.navigate('AddExpense', { groupId: expense.group_id, expenseId })}
                style={styles.headerBtn}
              >
                <Pencil size={18} color={COLORS.lavender} strokeWidth={2} />
              </TouchableOpacity>
              <TouchableOpacity onPress={handleDelete} style={styles.headerBtn}>
                <Trash2 size={18} color={COLORS.status.error} strokeWidth={2} />
              </TouchableOpacity>
            </>
          )}
        </View>
      </LinearGradient>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Category Hero */}
        <LinearGradient
          colors={[category.color + 'cc', category.color + '44']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={[styles.heroCard, SHADOWS.lg]}
        >
          <View style={styles.heroShimmer} />
          <View style={[styles.catIconBg, { backgroundColor: category.color + '33' }]}>
            <View style={[styles.catDot, { backgroundColor: category.color }]} />
            <Text style={[styles.catLabel, { color: category.color }]}>{category.label}</Text>
          </View>
          <Text style={styles.heroTitle}>{expense.title}</Text>
          <Text style={styles.heroAmount}>{formatCurrency(expense.amount)}</Text>
        </LinearGradient>

        {/* My Share */}
        <GlassCard style={styles.myShareCard}>
          <View style={styles.myShareRow}>
            <View>
              <Text style={styles.myShareLabel}>My Share</Text>
              <Text style={[styles.myShareAmount, { color: isPayer ? COLORS.status.success : COLORS.status.error }]}>
                {isPayer ? '+' : '-'}{formatCurrency(myShare)}
              </Text>
            </View>
            <View style={[styles.payerBadge, isPayer ? styles.payerBadgeGreen : styles.payerBadgeRed]}>
              <CreditCard size={14} color={isPayer ? COLORS.status.success : COLORS.status.error} strokeWidth={2} />
              <Text style={[styles.payerBadgeText, { color: isPayer ? COLORS.status.success : COLORS.status.error }]}>
                {isPayer ? 'You paid' : `${expense.payer?.full_name || 'Someone'} paid`}
              </Text>
            </View>
          </View>
        </GlassCard>

        {/* Details */}
        <GlassCard style={styles.detailsCard}>
          <DetailRow icon={<CalendarDays size={16} color={COLORS.lavender} strokeWidth={2} />} label="Date"     value={expense.date ? new Date(expense.date).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' }) : '—'} />
          <DetailRow icon={<SplitSquareHorizontal size={16} color={COLORS.lavender} strokeWidth={2} />} label="Split"  value={expense.split_type} />
          {expense.notes && <DetailRow icon={<StickyNote size={16} color={COLORS.lavender} strokeWidth={2} />} label="Notes" value={expense.notes} />}
        </GlassCard>

        {/* Splits */}
        <GlassCard style={styles.splitsCard}>
          <Text style={styles.splitsTitle}>How it's split</Text>
          {(expense.splits || []).map(s => (
            <View key={s.id} style={styles.splitRow}>
              <Avatar name={s.user?.full_name || ''} size={36} />
              <Text style={styles.splitName}>{s.user?.full_name || 'User'}</Text>
              <View style={styles.splitRight}>
                <Text style={styles.splitAmount}>{formatCurrency(s.amount)}</Text>
                {s.is_settled && (
                  <View style={styles.settledBadge}>
                    <CheckCircle size={12} color={COLORS.babyPink} strokeWidth={2} />
                    <Text style={styles.settledText}>Settled</Text>
                  </View>
                )}
              </View>
            </View>
          ))}
        </GlassCard>

        <View style={{ height: SPACING[8] }} />
      </ScrollView>
    </LinearGradient>
  );
}

function DetailRow({ icon, label, value }) {
  return (
    <View style={styles.detailRow}>
      <View style={styles.detailLeft}>
        {icon}
        <Text style={styles.detailLabel}>{label}</Text>
      </View>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root:           { flex: 1 },
  header:         { flexDirection: 'row', alignItems: 'center', padding: SPACING[5], paddingTop: SPACING[12] },
  backBtn:        { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle:    { flex: 1, color: COLORS.white, fontSize: FONTS.sizes.lg, fontWeight: '800', textAlign: 'center' },
  headerActions:  { flexDirection: 'row', gap: SPACING[2] },
  headerBtn:      { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,173,208,0.1)', alignItems: 'center', justifyContent: 'center' },
  heroCard:       { margin: SPACING[5], borderRadius: RADIUS['2xl'], padding: SPACING[6], alignItems: 'center', overflow: 'hidden' },
  heroShimmer:    { position: 'absolute', top: 0, left: 0, right: 0, height: '50%', backgroundColor: 'rgba(255,255,255,0.07)' },
  catIconBg:      { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: SPACING[4], paddingVertical: SPACING[2], borderRadius: RADIUS.full, marginBottom: SPACING[3] },
  catDot:         { width: 8, height: 8, borderRadius: 4 },
  catLabel:       { fontSize: FONTS.sizes.sm, fontWeight: '700' },
  heroTitle:      { color: '#fff', fontSize: FONTS.sizes['2xl'], fontWeight: '800', marginBottom: SPACING[2], textAlign: 'center' },
  heroAmount:     { color: '#fff', fontSize: FONTS.sizes['4xl'], fontWeight: '900', letterSpacing: -1 },
  myShareCard:    { marginHorizontal: SPACING[5], marginBottom: SPACING[3] },
  myShareRow:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  myShareLabel:   { color: COLORS.lavender, fontSize: FONTS.sizes.sm, marginBottom: 4 },
  myShareAmount:  { fontSize: FONTS.sizes['2xl'], fontWeight: '900' },
  payerBadge:     { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: SPACING[3], paddingVertical: SPACING[2], borderRadius: RADIUS.full },
  payerBadgeGreen:{ backgroundColor: COLORS.status.successBg },
  payerBadgeRed:  { backgroundColor: COLORS.status.errorBg },
  payerBadgeText: { fontSize: FONTS.sizes.xs, fontWeight: '700' },
  detailsCard:    { marginHorizontal: SPACING[5], marginBottom: SPACING[3], gap: SPACING[3] },
  detailRow:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  detailLeft:     { flexDirection: 'row', alignItems: 'center', gap: SPACING[2] },
  detailLabel:    { color: COLORS.lavender, fontSize: FONTS.sizes.sm },
  detailValue:    { color: COLORS.white,    fontSize: FONTS.sizes.sm, fontWeight: '600', flex: 1, textAlign: 'right', marginLeft: SPACING[4] },
  splitsCard:     { marginHorizontal: SPACING[5], gap: SPACING[3] },
  splitsTitle:    { color: COLORS.white, fontSize: FONTS.sizes.base, fontWeight: '700' },
  splitRow:       { flexDirection: 'row', alignItems: 'center', gap: SPACING[3] },
  splitName:      { flex: 1, color: COLORS.white, fontSize: FONTS.sizes.sm, fontWeight: '600' },
  splitRight:     { alignItems: 'flex-end' },
  splitAmount:    { color: COLORS.white, fontSize: FONTS.sizes.base, fontWeight: '700' },
  settledBadge:   { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2 },
  settledText:    { color: COLORS.babyPink, fontSize: FONTS.sizes.xs, fontWeight: '600' },
});
