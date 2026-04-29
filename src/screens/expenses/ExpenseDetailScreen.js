import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../context/AuthContext';
import { supabase, TABLES, CATEGORIES } from '../../config/supabase';
import { COLORS, FONTS, SPACING, RADIUS } from '../../config/theme';
import { formatCurrency } from '../../utils/splitCalculator';
import { GlassCard, Avatar, LoadingScreen, AcceptButton, DeclineButton, OutlineButton } from '../../components/UIComponents';

export default function ExpenseDetailScreen({ route, navigation }) {
  const { expenseId, groupId } = route.params;
  const { user } = useAuth();

  const [expense, setExpense] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchExpense(); }, [expenseId]);

  async function fetchExpense() {
    const { data, error } = await supabase
      .from(TABLES.EXPENSES)
      .select(`
        *,
        payer:users!paid_by(id, full_name, email),
        splits:expense_splits(
          *,
          user:users(id, full_name, email)
        )
      `)
      .eq('id', expenseId)
      .single();

    if (error) { Alert.alert('Error', error.message); navigation.goBack(); return; }
    setExpense(data);
    setLoading(false);
  }

  async function deleteExpense() {
    Alert.alert('Delete Expense', `Delete "${expense.title}"? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await supabase.from(TABLES.EXPENSE_SPLITS).delete().eq('expense_id', expenseId);
            await supabase.from(TABLES.EXPENSES).delete().eq('id', expenseId);
            navigation.goBack();
          } catch (err) {
            Alert.alert('Error', err.message);
          }
        },
      },
    ]);
  }

  if (loading) return <LoadingScreen message="Loading expense..." />;
  if (!expense) return null;

  const category = CATEGORIES.find(c => c.id === expense.category) || CATEGORIES[CATEGORIES.length - 1];
  const isPayer  = expense.paid_by === user.id;
  const myShare  = expense.splits?.find(s => s.user_id === user.id)?.amount ?? 0;
  const isOwner  = expense.paid_by === user.id || expense.created_by === user.id;

  return (
    <LinearGradient colors={COLORS.gradients.dark} style={styles.root}>
      {/* ── Header ── */}
      <LinearGradient
        colors={[category.color + '44', 'transparent']}
        style={styles.hero}
      >
        <TouchableOpacity style={styles.back} onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>

        <View style={[styles.categoryBadge, { backgroundColor: category.color + '22' }]}>
          <Text style={styles.categoryEmoji}>{category.icon}</Text>
        </View>
        <Text style={styles.title}>{expense.title}</Text>
        <Text style={styles.amount}>{formatCurrency(expense.amount)}</Text>
        <Text style={styles.date}>
          {expense.date
            ? new Date(expense.date).toLocaleDateString('en-PH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
            : ''}
        </Text>
      </LinearGradient>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* ── Your share ── */}
        <GlassCard style={[styles.shareCard, isPayer ? styles.payerCard : styles.oweCard]}>
          <View style={styles.shareRow}>
            <View>
              <Text style={styles.shareLabel}>{isPayer ? 'You paid' : 'Your share'}</Text>
              <Text style={[styles.shareAmt, { color: isPayer ? COLORS.status.success : COLORS.status.error }]}>
                {isPayer ? '+' : '-'}{formatCurrency(isPayer ? expense.amount : myShare)}
              </Text>
            </View>
            <Text style={styles.shareEmoji}>{isPayer ? '💳' : '💸'}</Text>
          </View>
          {isPayer && (
            <Text style={styles.shareNote}>
              Others owe you {formatCurrency(expense.splits?.filter(s => s.user_id !== user.id).reduce((a, s) => a + s.amount, 0) || 0)}
            </Text>
          )}
        </GlassCard>

        {/* ── Details ── */}
        <GlassCard style={styles.card}>
          <Text style={styles.sectionLabel}>Details</Text>
          {[
            ['Paid by',   expense.payer?.full_name || 'Unknown'],
            ['Category',  `${category.icon} ${category.label}`],
            ['Split type', expense.split_type === 'equal' ? '⚖️ Equal split' : '✏️ Custom split'],
          ].map(([k, v]) => (
            <View key={k} style={styles.detailRow}>
              <Text style={styles.detailKey}>{k}</Text>
              <Text style={styles.detailVal}>{v}</Text>
            </View>
          ))}
          {expense.notes && (
            <View style={[styles.detailRow, { flexDirection: 'column', gap: SPACING[1] }]}>
              <Text style={styles.detailKey}>Notes</Text>
              <Text style={[styles.detailVal, { color: COLORS.text.secondary }]}>{expense.notes}</Text>
            </View>
          )}
        </GlassCard>

        {/* ── Splits breakdown ── */}
        <GlassCard style={styles.card}>
          <Text style={styles.sectionLabel}>Split Breakdown</Text>
          {expense.splits?.map(split => (
            <View key={split.id} style={styles.splitRow}>
              <Avatar name={split.user?.full_name || ''} size={36} />
              <Text style={styles.splitName}>
                {split.user?.full_name || 'Unknown'}
                {split.user_id === user.id ? ' (You)' : ''}
                {split.user_id === expense.paid_by ? ' 💳' : ''}
              </Text>
              <View style={styles.splitRight}>
                <Text style={styles.splitAmt}>{formatCurrency(split.amount)}</Text>
                <Text style={styles.splitPct}>
                  {((split.amount / expense.amount) * 100).toFixed(0)}%
                </Text>
              </View>
            </View>
          ))}
        </GlassCard>

        {/* ── Actions ── */}
        {isOwner && (
          <View style={styles.actions}>
            <OutlineButton
              title="Edit Expense"
              icon="✏️"
              onPress={() => navigation.navigate('AddExpense', {
                groupId,
                expenseId,
                expense,
                members: expense.splits?.map(s => ({ user_id: s.user_id, full_name: s.user?.full_name })) || [],
                groupName: '',
              })}
              style={{ flex: 1 }}
            />
            <OutlineButton
              title="Delete"
              icon="🗑️"
              variant="danger"
              onPress={deleteExpense}
              style={{ flex: 1 }}
            />
          </View>
        )}

        <View style={{ height: SPACING[8] }} />
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root:    { flex: 1 },
  hero:    { padding: SPACING[6], paddingTop: SPACING[12], alignItems: 'center' },
  back:    { alignSelf: 'flex-start', marginBottom: SPACING[4] },
  backText:{ color: COLORS.purple[300], fontSize: FONTS.sizes.base, fontWeight: '600' },
  categoryBadge: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', marginBottom: SPACING[3] },
  categoryEmoji: { fontSize: 40 },
  title:   { color: COLORS.white, fontSize: FONTS.sizes['2xl'], fontWeight: '900', textAlign: 'center' },
  amount:  { color: COLORS.white, fontSize: FONTS.sizes['4xl'], fontWeight: '900', marginTop: SPACING[2] },
  date:    { color: COLORS.text.muted, fontSize: FONTS.sizes.sm, marginTop: SPACING[1] },
  scroll:  { padding: SPACING[5] },
  shareCard: { marginBottom: SPACING[4] },
  payerCard: { borderColor: COLORS.status.success + '44' },
  oweCard:   { borderColor: COLORS.status.error + '44' },
  shareRow:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  shareLabel:{ color: COLORS.text.muted, fontSize: FONTS.sizes.sm, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  shareAmt:  { fontSize: FONTS.sizes['2xl'], fontWeight: '900', marginTop: 4 },
  shareNote: { color: COLORS.text.secondary, fontSize: FONTS.sizes.sm, marginTop: SPACING[3] },
  shareEmoji:{ fontSize: 40 },
  card:        { marginBottom: SPACING[4] },
  sectionLabel:{ color: COLORS.text.secondary, fontSize: FONTS.sizes.sm, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: SPACING[3] },
  detailRow:   { flexDirection: 'row', justifyContent: 'space-between', marginBottom: SPACING[3] },
  detailKey:   { color: COLORS.text.muted, fontSize: FONTS.sizes.base },
  detailVal:   { color: COLORS.text.primary, fontSize: FONTS.sizes.base, fontWeight: '600', maxWidth: '60%', textAlign: 'right' },
  splitRow:    { flexDirection: 'row', alignItems: 'center', gap: SPACING[3], marginBottom: SPACING[3] },
  splitName:   { flex: 1, color: COLORS.text.primary, fontSize: FONTS.sizes.base },
  splitRight:  { alignItems: 'flex-end' },
  splitAmt:    { color: COLORS.text.primary, fontSize: FONTS.sizes.base, fontWeight: '700' },
  splitPct:    { color: COLORS.text.muted, fontSize: FONTS.sizes.xs },
  actions:     { flexDirection: 'row', gap: SPACING[3] },
});
