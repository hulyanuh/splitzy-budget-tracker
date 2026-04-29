import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronRight, CreditCard, TrendingUp, TrendingDown, CheckCircle, ArrowRight } from 'lucide-react-native';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../config/theme';
import { CATEGORIES } from '../config/supabase';
import { formatCurrency } from '../utils/splitCalculator';
import { Avatar, GlassCard } from './UIComponents';

// ─────────────────────────────────────────────────────────────────────────────
// 💸 EXPENSE CARD
// ─────────────────────────────────────────────────────────────────────────────
export function ExpenseCard({ expense, onPress, currentUserId }) {
  const category = CATEGORIES.find(c => c.id === expense.category) || CATEGORIES[CATEGORIES.length - 1];
  const isPayer  = expense.paid_by === currentUserId;
  const myShare  = expense.splits?.find(s => s.user_id === currentUserId)?.amount ?? 0;

  return (
    <GlassCard onPress={onPress} style={styles.expenseCard}>
      <View style={styles.expenseRow}>
        <View style={[styles.catIcon, { backgroundColor: category.color + '22' }]}>
          <Text style={styles.catEmoji}>{category.icon}</Text>
        </View>
        <View style={styles.expenseInfo}>
          <Text style={styles.expenseTitle} numberOfLines={1}>{expense.title}</Text>
          <View style={styles.expenseSubRow}>
            <CreditCard size={11} color={COLORS.lavender} strokeWidth={1.8} />
            <Text style={styles.expenseSub}>
              {'  '}{isPayer ? 'You paid' : `${expense.payer_name || 'Someone'} paid`}
            </Text>
          </View>
          <Text style={styles.expenseDate}>
            {expense.date ? new Date(expense.date).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' }) : ''}
          </Text>
        </View>
        <View style={styles.expenseAmounts}>
          <Text style={styles.totalAmt}>{formatCurrency(expense.amount)}</Text>
          <View style={[styles.myShareBadge, isPayer ? styles.payerBadge : styles.oweBadge]}>
            <Text style={[styles.myShareText, { color: isPayer ? COLORS.status.success : COLORS.status.error }]}>
              {isPayer ? '+' : '-'}{formatCurrency(myShare)}
            </Text>
          </View>
        </View>
      </View>
    </GlassCard>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 👥 GROUP CARD
// ─────────────────────────────────────────────────────────────────────────────
export function GroupCard({ group, onPress, myBalance }) {
  const balancePositive = (myBalance || 0) >= 0;

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8} style={[styles.groupCard, SHADOWS.md]}>
      <LinearGradient
        colors={['#2a1040', '#1c0a32']}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={styles.groupGrad}
      >
        <View style={styles.groupHeader}>
          <LinearGradient colors={['#9b59d0', '#ffadd0']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.groupIconBg}>
            <Text style={styles.groupEmoji}>{group.emoji || '👥'}</Text>
          </LinearGradient>
          <View style={styles.groupInfo}>
            <Text style={styles.groupName} numberOfLines={1}>{group.name}</Text>
            <Text style={styles.groupMeta}>
              {group.member_count || 0} members · {group.expense_count || 0} expenses
            </Text>
          </View>
          <ChevronRight size={18} color={COLORS.lavender} strokeWidth={1.8} />
        </View>

        {myBalance !== undefined && (
          <View style={styles.groupBalanceRow}>
            <View style={[styles.balancePill, balancePositive ? styles.greenPill : styles.redPill]}>
              {balancePositive
                ? <TrendingUp  size={12} color={COLORS.status.success} strokeWidth={2} />
                : <TrendingDown size={12} color={COLORS.status.error}  strokeWidth={2} />
              }
              <Text style={[styles.balanceText, { color: balancePositive ? COLORS.status.success : COLORS.status.error }]}>
                {'  '}{balancePositive ? 'You get back ' : 'You owe '}{formatCurrency(Math.abs(myBalance))}
              </Text>
            </View>
          </View>
        )}
      </LinearGradient>
    </TouchableOpacity>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 💳 BALANCE CARD
// ─────────────────────────────────────────────────────────────────────────────
export function BalanceCard({ member, style }) {
  const settled    = Math.abs(member.balance) < 0.01;
  const isPositive = member.balance > 0;

  return (
    <GlassCard style={[styles.balCard, style]}>
      <View style={styles.balRow}>
        <Avatar name={member.full_name || member.name || '?'} size={44} />
        <View style={styles.balInfo}>
          <Text style={styles.balName}>{member.full_name || member.name}</Text>
          <Text style={styles.balSub}>
            Paid {formatCurrency(member.totalPaid)} · Share {formatCurrency(member.totalShare)}
          </Text>
        </View>
        <View style={styles.balRight}>
          {settled ? (
            <View style={styles.settledRow}>
              <CheckCircle size={14} color={COLORS.babyPink} strokeWidth={2} />
              <Text style={styles.settledText}>  Settled</Text>
            </View>
          ) : (
            <>
              <Text style={[styles.balAmount, { color: isPositive ? COLORS.status.success : COLORS.status.error }]}>
                {isPositive ? '+' : ''}{formatCurrency(member.balance)}
              </Text>
              <Text style={styles.balLabel}>{isPositive ? 'gets back' : 'owes'}</Text>
            </>
          )}
        </View>
      </View>
    </GlassCard>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 🔄 TRANSACTION ROW
// ─────────────────────────────────────────────────────────────────────────────
export function TransactionRow({ transaction, memberMap }) {
  const from = memberMap[transaction.from] || { full_name: 'Unknown' };
  const to   = memberMap[transaction.to]   || { full_name: 'Unknown' };

  return (
    <GlassCard style={styles.txRow}>
      <Avatar name={from.full_name} size={36} />
      <View style={styles.txMid}>
        <Text style={styles.txName}>{from.full_name}</Text>
        <View style={styles.txArrowRow}>
          <ArrowRight size={16} color={COLORS.babyPink} strokeWidth={2} />
        </View>
        <Text style={styles.txAmount}>{formatCurrency(transaction.amount)}</Text>
      </View>
      <Avatar name={to.full_name} size={36} />
    </GlassCard>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  expenseCard:    { marginBottom: SPACING[3] },
  expenseRow:     { flexDirection: 'row', alignItems: 'center' },
  catIcon:        { width: 48, height: 48, borderRadius: RADIUS.md, alignItems: 'center', justifyContent: 'center', marginRight: SPACING[3] },
  catEmoji:       { fontSize: 24 },
  expenseInfo:    { flex: 1 },
  expenseTitle:   { color: COLORS.white,    fontSize: FONTS.sizes.base, fontWeight: '700', marginBottom: 3 },
  expenseSubRow:  { flexDirection: 'row', alignItems: 'center', marginBottom: 2 },
  expenseSub:     { color: COLORS.lavender, fontSize: FONTS.sizes.xs },
  expenseDate:    { color: COLORS.text.muted, fontSize: FONTS.sizes.xs },
  expenseAmounts: { alignItems: 'flex-end' },
  totalAmt:       { color: COLORS.white,    fontSize: FONTS.sizes.md, fontWeight: '700', marginBottom: 4 },
  myShareBadge:   { borderRadius: RADIUS.full, paddingHorizontal: SPACING[2], paddingVertical: 2 },
  payerBadge:     { backgroundColor: COLORS.status.successBg },
  oweBadge:       { backgroundColor: COLORS.status.errorBg },
  myShareText:    { fontSize: FONTS.sizes.xs, fontWeight: '700' },

  groupCard:       { borderRadius: RADIUS.xl, overflow: 'hidden', marginBottom: SPACING[3] },
  groupGrad:       { padding: SPACING[4], borderWidth: 1, borderColor: 'rgba(255,173,208,0.15)', borderRadius: RADIUS.xl },
  groupHeader:     { flexDirection: 'row', alignItems: 'center' },
  groupIconBg:     { width: 48, height: 48, borderRadius: RADIUS.md, alignItems: 'center', justifyContent: 'center', marginRight: SPACING[3] },
  groupEmoji:      { fontSize: 24 },
  groupInfo:       { flex: 1 },
  groupName:       { color: COLORS.white,   fontSize: FONTS.sizes.md, fontWeight: '700' },
  groupMeta:       { color: COLORS.lavender, fontSize: FONTS.sizes.xs, marginTop: 2 },
  groupBalanceRow: { marginTop: SPACING[3], paddingTop: SPACING[3], borderTopWidth: 1, borderTopColor: 'rgba(255,173,208,0.1)' },
  balancePill:     { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', paddingHorizontal: SPACING[3], paddingVertical: SPACING[1], borderRadius: RADIUS.full },
  greenPill:       { backgroundColor: COLORS.status.successBg },
  redPill:         { backgroundColor: COLORS.status.errorBg },
  balanceText:     { fontSize: FONTS.sizes.sm, fontWeight: '700' },

  balCard:      { marginBottom: SPACING[3] },
  balRow:       { flexDirection: 'row', alignItems: 'center' },
  balInfo:      { flex: 1, marginLeft: SPACING[3] },
  balName:      { color: COLORS.white,   fontSize: FONTS.sizes.base, fontWeight: '700' },
  balSub:       { color: COLORS.lavender, fontSize: FONTS.sizes.xs, marginTop: 2 },
  balRight:     { alignItems: 'flex-end' },
  settledRow:   { flexDirection: 'row', alignItems: 'center' },
  settledText:  { color: COLORS.babyPink, fontSize: FONTS.sizes.sm, fontWeight: '600' },
  balAmount:    { fontSize: FONTS.sizes.base, fontWeight: '800' },
  balLabel:     { color: COLORS.lavender, fontSize: FONTS.sizes.xs, marginTop: 2 },

  txRow:      { flexDirection: 'row', alignItems: 'center', gap: SPACING[3], marginBottom: SPACING[3] },
  txMid:      { flex: 1, alignItems: 'center' },
  txName:     { color: COLORS.lavender, fontSize: FONTS.sizes.xs, marginBottom: 2 },
  txArrowRow: { marginVertical: 2 },
  txAmount:   { color: COLORS.white, fontSize: FONTS.sizes.base, fontWeight: '800', marginTop: 2 },
});
