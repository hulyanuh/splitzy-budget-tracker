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
    const { data, error } = await supabase
      .from(TABLES.EXPENSES)
      .select('*, group:groups(name, created_by), splits:expense_splits(*)')
      .eq('id', expenseId)
      .single();
      
    if (error) {
      console.error('fetchExpense error:', error);
      Alert.alert('Error', 'Failed to load expense details.');
      navigation.goBack();
      return;
    }
      
    if (data) {
      // Fetch group creator name
      const { data: creatorData } = await supabase
        .from(TABLES.USERS)
        .select('full_name')
        .eq('id', data.group.created_by)
        .single();
      if (creatorData) {
        data.group.creator_name = creatorData.full_name;
      }

      // Manual fetch for payer
      const { data: payerData } = await supabase.from(TABLES.USERS).select('full_name, email').eq('id', data.paid_by).single();
      if (payerData) {
        data.payer = payerData;
      }
      
      // Fetch all group members for unified splits mapping
      const { data: gmData } = await supabase
        .from(TABLES.GROUP_MEMBERS)
        .select('*, user:users(id, full_name, email)')
        .eq('group_id', data.group_id);

      if (data.splits && data.splits.length > 0 && gmData) {
        data.splits = data.splits.map(s => {
          const member = gmData.find(m => s.user_id ? m.user_id === s.user_id : m.id === s.guest_member_id);
          return {
            ...s,
            displayName: member?.user?.full_name || member?.display_name || 'Guest Member',
            email: member?.user?.email || 'Guest (No Account)',
          };
        });
      }
    }
    
    setExpense(data);
    setLoading(false);
  }

  async function toggleSplitSettled(split) {
    const isGroupOwner = expense?.group?.created_by === user.id;
    if (!isGroupOwner) {
      Alert.alert('Permission Denied', 'Only the group owner is allowed to mark splits as paid.');
      return;
    }
    const newStatus = !split.is_settled;
    try {
      const { error } = await supabase
        .from(TABLES.EXPENSE_SPLITS)
        .update({ is_settled: newStatus, settled_at: newStatus ? new Date().toISOString() : null })
        .eq('id', split.id);
      
      if (error) throw error;
      
      // Update local state
      setExpense(prev => ({
        ...prev,
        splits: prev.splits.map(s => s.id === split.id ? { ...s, is_settled: newStatus } : s)
      }));
    } catch (e) {
      Alert.alert('Error', e.message);
    }
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
  const mySplit  = expense.splits?.find(s => s.user_id === user.id);
  const myShare  = mySplit?.amount ?? 0;
  const isMyShareSettled = mySplit?.is_settled ?? false;

  const othersOwe = expense.splits?.filter(s => s.user_id !== user.id && !s.is_settled).reduce((a, s) => a + s.amount, 0) || 0;
  const isFullySettled = expense.splits?.filter(s => s.user_id !== user.id).every(s => s.is_settled) ?? true;

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
          <Text style={styles.heroAmount}>{formatCurrency(expense.amount, expense.group?.currency || 'PHP')}</Text>
        </LinearGradient>

        {/* My Share */}
        <GlassCard style={[styles.myShareCard, isMyShareSettled && styles.myShareCardGreen]}>
          <View style={styles.myShareRow}>
            <View style={{ backgroundColor: 'transparent' }}>
              <Text style={styles.myShareLabel}>My Share</Text>
              <Text style={[
                styles.myShareAmount, 
                { color: (isPayer || isMyShareSettled) ? COLORS.status.success : COLORS.status.error }
              ]}>
                {(isPayer || isMyShareSettled) ? '+' : '-'}{formatCurrency(myShare, expense.group?.currency || 'PHP')}
              </Text>
            </View>
            <View style={[
              styles.payerBadge, 
              (isPayer || isMyShareSettled) ? styles.payerBadgeGreen : styles.payerBadgeRed
            ]}>
              {isMyShareSettled ? (
                <>
                  <CheckCircle size={14} color={COLORS.status.success} strokeWidth={2} />
                  <Text style={[styles.payerBadgeText, { color: COLORS.status.success }]}>Paid</Text>
                </>
              ) : (
                <>
                  <CreditCard size={14} color={isPayer ? COLORS.status.success : COLORS.status.error} strokeWidth={2} />
                  <Text style={[styles.payerBadgeText, { color: isPayer ? COLORS.status.success : COLORS.status.error }]}>
                    {isPayer ? 'You paid' : `${expense.payer?.full_name || 'Someone'} paid`}
                  </Text>
                </>
              )}
            </View>
          </View>
          <View style={styles.instructionBox}>
            <Text style={styles.instructionText}>
              {isPayer ? (
                isFullySettled ? (
                  "🎉 Everyone has paid you back! This expense is fully settled."
                ) : (
                  `👉 You paid the full amount. Other members owe you a total of ${formatCurrency(othersOwe, expense.group?.currency || 'PHP')}.`
                )
              ) : (
                isMyShareSettled ? (
                  `🎉 You settled your share with ${expense.payer?.full_name || 'the payer'}.`
                ) : (
                  `👉 Give ${formatCurrency(myShare, expense.group?.currency || 'PHP')} to ${expense.payer?.full_name || 'the payer'}.`
                )
              )}
            </Text>
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
          
          <View style={styles.leaderBanner}>
            <Text style={styles.leaderBannerText}>
              👑 Group Leader: <Text style={styles.boldText}>{expense.group?.creator_name || 'Owner'}</Text>
            </Text>
            <Text style={styles.leaderBannerSub}>
              {expense.group?.created_by === user.id 
                ? "You are the Group Leader! Tap any split below to toggle its status." 
                : "Only the Group Leader is allowed to mark splits as paid."}
            </Text>
          </View>

          {(expense.splits || []).map(s => (
            <View key={s.id} style={styles.splitRow}>
              <Avatar name={s.displayName || ''} size={36} />
              <View style={{ flex: 1 }}>
                <Text style={styles.splitName}>{s.displayName || 'User'}</Text>
                <Text style={styles.splitSubtext}>
                  {s.user_id === expense.paid_by 
                    ? "Paid full amount" 
                    : (s.is_settled 
                      ? `Paid ${expense.payer?.full_name?.split(' ')[0] || 'payer'}` 
                      : `Owes ${expense.payer?.full_name?.split(' ')[0] || 'payer'}`)}
                </Text>
              </View>
              <View style={styles.splitRight}>
                <Text style={styles.splitAmount}>{formatCurrency(s.amount, expense.group?.currency || 'PHP')}</Text>
                {s.is_settled ? (
                  <TouchableOpacity 
                    style={styles.settledBadge} 
                    disabled={expense?.group?.created_by !== user.id} 
                    onPress={() => toggleSplitSettled(s)}
                  >
                    <CheckCircle size={12} color={COLORS.babyPink} strokeWidth={2} />
                    <Text style={styles.settledText}>Paid</Text>
                  </TouchableOpacity>
                ) : (
                  expense?.group?.created_by === user.id && (
                    <TouchableOpacity style={styles.markPaidBtn} onPress={() => toggleSplitSettled(s)}>
                      <Text style={styles.markPaidText}>Mark Paid</Text>
                    </TouchableOpacity>
                  )
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
  heroTitle:      { color: '#fff', fontSize: FONTS.sizes['2xl'], fontWeight: '800', marginBottom: SPACING[2], textAlign: 'center', backgroundColor: 'transparent' },
  heroAmount:     { color: '#fff', fontSize: FONTS.sizes['4xl'], fontWeight: '900', letterSpacing: -1, backgroundColor: 'transparent' },
  myShareCard:    { marginHorizontal: SPACING[5], marginBottom: SPACING[3] },
  myShareCardGreen: { borderColor: 'rgba(34,197,94,0.3)', backgroundColor: '#1a3322' },
  myShareRow:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'transparent' },
  myShareLabel:   { color: COLORS.lavender, fontSize: FONTS.sizes.sm, marginBottom: 4, backgroundColor: 'transparent' },
  myShareAmount:  { fontSize: FONTS.sizes['2xl'], fontWeight: '900', backgroundColor: 'transparent' },
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
  markPaidBtn:    { backgroundColor: 'rgba(255,173,208,0.15)', paddingHorizontal: SPACING[3], paddingVertical: 4, borderRadius: RADIUS.md, marginTop: 4 },
  markPaidText:   { color: COLORS.babyPink, fontSize: FONTS.sizes.xs, fontWeight: '700' },
  leaderBanner:   { backgroundColor: 'rgba(155,89,208,0.08)', borderLeftWidth: 3, borderLeftColor: '#9b59d0', padding: SPACING[3], borderRadius: RADIUS.md, marginVertical: 4 },
  leaderBannerText: { color: COLORS.white, fontSize: FONTS.sizes.sm, fontWeight: '600', marginBottom: 2 },
  leaderBannerSub: { color: COLORS.lavender, fontSize: FONTS.sizes.xs, lineHeight: 16 },
  boldText:       { fontWeight: '800', color: COLORS.babyPink },
  instructionBox: { marginTop: SPACING[3], paddingTop: SPACING[3], borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)' },
  instructionText: { color: COLORS.lavender, fontSize: FONTS.sizes.sm, lineHeight: 18, fontStyle: 'italic' },
  splitSubtext:   { color: COLORS.lavender, fontSize: FONTS.sizes.xs, marginTop: 2 },
});
