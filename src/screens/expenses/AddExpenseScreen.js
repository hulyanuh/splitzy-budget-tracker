import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, KeyboardAvoidingView,
  Platform, TouchableOpacity, Alert, TextInput,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../context/AuthContext';
import { supabase, TABLES, CATEGORIES, SPLIT_TYPES } from '../../config/supabase';
import { COLORS, FONTS, SPACING, RADIUS } from '../../config/theme';
import { calculateEqualSplit, validateCustomSplit, formatCurrency } from '../../utils/splitCalculator';
import {
  GradientButton, OutlineButton, StyledInput, GlassCard,
  Avatar, AcceptButton, DeclineButton,
} from '../../components/UIComponents';

export default function AddExpenseScreen({ route, navigation }) {
  const { groupId, members = [], groupName } = route.params;
  const { user } = useAuth();

  const [title,      setTitle]      = useState('');
  const [amount,     setAmount]     = useState('');
  const [category,   setCategory]   = useState('food');
  const [date,       setDate]       = useState(new Date().toISOString().split('T')[0]);
  const [paidBy,     setPaidBy]     = useState(user.id);
  const [splitType,  setSplitType]  = useState(SPLIT_TYPES.EQUAL);
  const [customAmts, setCustomAmts] = useState({});
  const [notes,      setNotes]      = useState('');
  const [loading,    setLoading]    = useState(false);
  const [step,       setStep]       = useState(1); // 1=details, 2=split, 3=confirm
  const [errors,     setErrors]     = useState({});

  const parsedAmt = parseFloat(amount) || 0;
  const memberIds = members.map(m => m.user_id);

  // ── Equal split calculation ──────────────────────────────────────────────
  const equalSplits = parsedAmt > 0
    ? calculateEqualSplit(parsedAmt, memberIds)
    : memberIds.reduce((a, id) => ({ ...a, [id]: 0 }), {});

  // ── Step 1 validation ────────────────────────────────────────────────────
  function validateStep1() {
    const e = {};
    if (!title.trim())  e.title  = 'Expense title is required';
    if (!parsedAmt || parsedAmt <= 0) e.amount = 'Enter a valid amount';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  // ── Step 2 validation ────────────────────────────────────────────────────
  function validateStep2() {
    if (splitType === SPLIT_TYPES.CUSTOM) {
      const isValid = validateCustomSplit(parsedAmt, customAmts);
      if (!isValid) {
        const sum = Object.values(customAmts).reduce((a, b) => a + parseFloat(b || 0), 0);
        Alert.alert(
          'Invalid Split',
          `Amounts must add up to ${formatCurrency(parsedAmt)}.\nCurrent total: ${formatCurrency(sum)}`,
        );
        return false;
      }
    }
    return true;
  }

  function goNext() {
    if (step === 1 && validateStep1()) setStep(2);
    if (step === 2 && validateStep2()) setStep(3);
  }

  // ── Save expense ─────────────────────────────────────────────────────────
  async function saveExpense() {
    setLoading(true);
    try {
      const finalSplits = splitType === SPLIT_TYPES.EQUAL ? equalSplits : customAmts;

      // Insert expense
      const { data: expense, error: eErr } = await supabase
        .from(TABLES.EXPENSES)
        .insert({
          group_id: groupId,
          title:    title.trim(),
          amount:   parsedAmt,
          category,
          date,
          paid_by:  paidBy,
          notes:    notes.trim(),
          split_type: splitType,
        })
        .select()
        .single();
      if (eErr) throw eErr;

      // Insert splits
      const splitRows = memberIds.map(uid => ({
        expense_id: expense.id,
        user_id:    uid,
        amount:     parseFloat(finalSplits[uid] || 0),
      }));
      const { error: sErr } = await supabase.from(TABLES.EXPENSE_SPLITS).insert(splitRows);
      if (sErr) throw sErr;

      Alert.alert('💸 Expense Added!', `"${title}" has been added to ${groupName}.`, [
        { text: 'Done', onPress: () => navigation.goBack() },
      ]);
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  }

  const currentCategory = CATEGORIES.find(c => c.id === category);
  const payer = members.find(m => m.user_id === paidBy);

  return (
    <LinearGradient colors={COLORS.gradients.dark} style={{ flex: 1 }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>

        {/* ── Header ── */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => step > 1 ? setStep(s => s - 1) : navigation.goBack()}>
            <Text style={styles.backText}>← {step > 1 ? 'Back' : 'Cancel'}</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Add Expense</Text>
          <Text style={styles.stepBadge}>Step {step}/3</Text>
        </View>

        {/* ── Progress ── */}
        <View style={styles.progressBar}>
          {[1, 2, 3].map(s => (
            <View key={s} style={[styles.progressDot, s <= step && styles.progressDotActive]} />
          ))}
        </View>

        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

          {/* ══════════ STEP 1: Details ══════════ */}
          {step === 1 && (
            <>
              <Text style={styles.stepTitle}>Expense Details</Text>

              <GlassCard style={styles.card}>
                <StyledInput
                  label="Title *"
                  placeholder="Dinner at Jollibee..."
                  value={title}
                  onChangeText={setTitle}
                  error={errors.title}
                />
                <StyledInput
                  label="Amount (₱) *"
                  placeholder="0.00"
                  value={amount}
                  onChangeText={setAmount}
                  keyboardType="decimal-pad"
                  error={errors.amount}
                />
                <StyledInput
                  label="Date"
                  placeholder="YYYY-MM-DD"
                  value={date}
                  onChangeText={setDate}
                />
                <StyledInput
                  label="Notes (optional)"
                  placeholder="Any extra details..."
                  value={notes}
                  onChangeText={setNotes}
                  multiline
                  numberOfLines={2}
                  inputStyle={{ height: 64, textAlignVertical: 'top' }}
                />
              </GlassCard>

              {/* Category */}
              <GlassCard style={styles.card}>
                <Text style={styles.sectionLabel}>Category</Text>
                <View style={styles.catGrid}>
                  {CATEGORIES.map(c => (
                    <TouchableOpacity
                      key={c.id}
                      style={[styles.catChip, category === c.id && styles.catChipSelected, { borderColor: c.color }]}
                      onPress={() => setCategory(c.id)}
                    >
                      <Text style={styles.catEmoji}>{c.icon}</Text>
                      <Text style={[styles.catLabel, { color: category === c.id ? c.color : COLORS.text.muted }]}>
                        {c.label.split(' ')[0]}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </GlassCard>

              {/* Who paid */}
              <GlassCard style={styles.card}>
                <Text style={styles.sectionLabel}>Who Paid?</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {members.map(m => (
                    <TouchableOpacity
                      key={m.user_id}
                      style={[styles.payerChip, paidBy === m.user_id && styles.payerChipSelected]}
                      onPress={() => setPaidBy(m.user_id)}
                    >
                      <Avatar name={m.user?.full_name || m.full_name || ''} size={40} />
                      <Text style={styles.payerName} numberOfLines={1}>
                        {(m.user?.full_name || m.full_name || '').split(' ')[0]}
                        {m.user_id === user.id ? ' (You)' : ''}
                      </Text>
                      {paidBy === m.user_id && <Text style={styles.payerCheck}>✓</Text>}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </GlassCard>
            </>
          )}

          {/* ══════════ STEP 2: Split ══════════ */}
          {step === 2 && (
            <>
              <Text style={styles.stepTitle}>Split Details</Text>

              <GlassCard style={styles.card}>
                <Text style={styles.sectionLabel}>Split Type</Text>
                <View style={styles.splitTypeRow}>
                  {[
                    { value: SPLIT_TYPES.EQUAL,  label: '⚖️ Equal',  desc: 'Split evenly' },
                    { value: SPLIT_TYPES.CUSTOM, label: '✏️ Custom', desc: 'Set amounts' },
                  ].map(opt => (
                    <TouchableOpacity
                      key={opt.value}
                      style={[styles.splitChip, splitType === opt.value && styles.splitChipSelected]}
                      onPress={() => setSplitType(opt.value)}
                    >
                      <Text style={styles.splitChipLabel}>{opt.label}</Text>
                      <Text style={styles.splitChipDesc}>{opt.desc}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </GlassCard>

              {/* Split breakdown */}
              <GlassCard style={styles.card}>
                <Text style={styles.sectionLabel}>Breakdown — {formatCurrency(parsedAmt)} total</Text>
                {members.map(m => {
                  const memberId = m.user_id;
                  const memberName = m.user?.full_name || m.full_name || 'Unknown';

                  return (
                    <View key={memberId} style={styles.splitRow}>
                      <Avatar name={memberName} size={36} />
                      <Text style={styles.splitName} numberOfLines={1}>
                        {memberName.split(' ')[0]}{memberId === user.id ? ' (You)' : ''}
                      </Text>
                      {splitType === SPLIT_TYPES.EQUAL ? (
                        <Text style={styles.splitEqual}>
                          {formatCurrency(equalSplits[memberId] || 0)}
                        </Text>
                      ) : (
                        <TextInput
                          style={styles.splitInput}
                          placeholder="0.00"
                          placeholderTextColor={COLORS.text.placeholder}
                          keyboardType="decimal-pad"
                          value={customAmts[memberId] ? String(customAmts[memberId]) : ''}
                          onChangeText={val => setCustomAmts(prev => ({ ...prev, [memberId]: parseFloat(val) || 0 }))}
                          selectionColor={COLORS.purple[400]}
                        />
                      )}
                    </View>
                  );
                })}

                {splitType === SPLIT_TYPES.CUSTOM && (
                  <View style={styles.splitTotal}>
                    <Text style={styles.splitTotalLabel}>Assigned:</Text>
                    <Text style={[
                      styles.splitTotalAmt,
                      {
                        color: validateCustomSplit(parsedAmt, customAmts)
                          ? COLORS.status.success
                          : COLORS.status.error,
                      },
                    ]}>
                      {formatCurrency(Object.values(customAmts).reduce((a, b) => a + (parseFloat(b) || 0), 0))}
                      {' / '}{formatCurrency(parsedAmt)}
                    </Text>
                  </View>
                )}
              </GlassCard>
            </>
          )}

          {/* ══════════ STEP 3: Confirm ══════════ */}
          {step === 3 && (
            <>
              <Text style={styles.stepTitle}>Confirm Expense</Text>

              <LinearGradient colors={COLORS.gradients.primary} style={styles.confirmHero}>
                <Text style={styles.confirmEmoji}>{currentCategory?.icon}</Text>
                <Text style={styles.confirmTitle}>{title}</Text>
                <Text style={styles.confirmAmt}>{formatCurrency(parsedAmt)}</Text>
                <Text style={styles.confirmPayer}>
                  Paid by {payer?.user?.full_name || payer?.full_name || 'Unknown'}
                </Text>
              </LinearGradient>

              <GlassCard style={styles.card}>
                <Text style={styles.sectionLabel}>Summary</Text>
                {[
                  ['Group',    groupName],
                  ['Category', `${currentCategory?.icon} ${currentCategory?.label}`],
                  ['Date',     date],
                  ['Split',    splitType === SPLIT_TYPES.EQUAL ? 'Equal split' : 'Custom split'],
                ].map(([k, v]) => (
                  <View key={k} style={styles.summaryRow}>
                    <Text style={styles.summaryKey}>{k}</Text>
                    <Text style={styles.summaryVal}>{v}</Text>
                  </View>
                ))}
              </GlassCard>

              <GlassCard style={styles.card}>
                <Text style={styles.sectionLabel}>Each Person Pays</Text>
                {members.map(m => {
                  const splits = splitType === SPLIT_TYPES.EQUAL ? equalSplits : customAmts;
                  const share  = splits[m.user_id] || 0;
                  const mName  = m.user?.full_name || m.full_name || 'Unknown';
                  return (
                    <View key={m.user_id} style={styles.confirmSplitRow}>
                      <Avatar name={mName} size={32} />
                      <Text style={styles.confirmSplitName}>{mName}</Text>
                      <Text style={styles.confirmSplitAmt}>{formatCurrency(share)}</Text>
                    </View>
                  );
                })}
              </GlassCard>

              {/* ── Accept / Decline ── */}
              <Text style={styles.decisionLabel}>Confirm this expense?</Text>
              <View style={styles.decisionRow}>
                <DeclineButton
                  title="Cancel"
                  onPress={() => navigation.goBack()}
                  style={{ flex: 1 }}
                />
                <AcceptButton
                  title="Confirm & Save"
                  onPress={saveExpense}
                  style={{ flex: 1 }}
                />
              </View>
            </>
          )}

          {/* Next button (steps 1 and 2) */}
          {step < 3 && (
            <GradientButton
              title={step === 2 ? 'Review Expense →' : 'Next: Split →'}
              onPress={goNext}
              style={{ marginTop: SPACING[4] }}
            />
          )}

          <View style={{ height: SPACING[8] }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection:  'row',
    justifyContent: 'space-between',
    alignItems:     'center',
    paddingHorizontal: SPACING[5],
    paddingTop:     SPACING[12],
    paddingBottom:  SPACING[4],
  },
  backText:     { color: COLORS.purple[300], fontSize: FONTS.sizes.base, fontWeight: '600' },
  headerTitle:  { color: COLORS.white, fontSize: FONTS.sizes.lg, fontWeight: '800' },
  stepBadge:    { color: COLORS.text.muted, fontSize: FONTS.sizes.sm },
  progressBar:  { flexDirection: 'row', justifyContent: 'center', gap: SPACING[2], marginBottom: SPACING[4] },
  progressDot:  { width: 80, height: 4, borderRadius: 2, backgroundColor: COLORS.background.elevated },
  progressDotActive: { backgroundColor: COLORS.purple[500] },
  scroll:      { padding: SPACING[5] },
  stepTitle:   { color: COLORS.white, fontSize: FONTS.sizes['2xl'], fontWeight: '900', marginBottom: SPACING[5] },
  card:        { marginBottom: SPACING[4] },
  sectionLabel:{ color: COLORS.text.secondary, fontSize: FONTS.sizes.sm, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: SPACING[3] },
  catGrid:     { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING[2] },
  catChip:     { alignItems: 'center', padding: SPACING[3], borderRadius: RADIUS.md, borderWidth: 1.5, borderColor: 'transparent', backgroundColor: COLORS.background.elevated, width: '22%' },
  catChipSelected: { backgroundColor: COLORS.background.card },
  catEmoji:    { fontSize: 22 },
  catLabel:    { fontSize: 9, fontWeight: '700', marginTop: 4, textAlign: 'center' },
  payerChip:   { alignItems: 'center', marginRight: SPACING[3], padding: SPACING[3], borderRadius: RADIUS.lg, borderWidth: 1.5, borderColor: 'transparent', backgroundColor: COLORS.background.elevated },
  payerChipSelected: { borderColor: COLORS.purple[500], backgroundColor: COLORS.purple[900] + '66' },
  payerName:   { color: COLORS.text.secondary, fontSize: FONTS.sizes.xs, marginTop: SPACING[1], width: 64, textAlign: 'center' },
  payerCheck:  { color: COLORS.status.success, fontSize: 14, fontWeight: '700' },
  splitTypeRow:{ flexDirection: 'row', gap: SPACING[3] },
  splitChip:   { flex: 1, padding: SPACING[4], borderRadius: RADIUS.md, backgroundColor: COLORS.background.elevated, alignItems: 'center', borderWidth: 1.5, borderColor: 'transparent' },
  splitChipSelected: { borderColor: COLORS.purple[500], backgroundColor: COLORS.purple[900] + '66' },
  splitChipLabel: { color: COLORS.text.primary, fontSize: FONTS.sizes.base, fontWeight: '700' },
  splitChipDesc:  { color: COLORS.text.muted,   fontSize: FONTS.sizes.xs, marginTop: 2 },
  splitRow:    { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING[3], gap: SPACING[3] },
  splitName:   { flex: 1, color: COLORS.text.primary, fontSize: FONTS.sizes.base },
  splitEqual:  { color: COLORS.purple[300], fontSize: FONTS.sizes.base, fontWeight: '700' },
  splitInput:  { width: 90, backgroundColor: COLORS.background.input, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.sm, paddingHorizontal: SPACING[3], paddingVertical: SPACING[2], color: COLORS.text.primary, fontSize: FONTS.sizes.base, textAlign: 'right' },
  splitTotal:  { flexDirection: 'row', justifyContent: 'space-between', marginTop: SPACING[4], paddingTop: SPACING[3], borderTopWidth: 1, borderTopColor: COLORS.borderLight },
  splitTotalLabel: { color: COLORS.text.muted, fontSize: FONTS.sizes.base },
  splitTotalAmt:   { fontSize: FONTS.sizes.base, fontWeight: '700' },
  confirmHero: { borderRadius: RADIUS['2xl'], padding: SPACING[6], alignItems: 'center', marginBottom: SPACING[4] },
  confirmEmoji:{ fontSize: 48, marginBottom: SPACING[2] },
  confirmTitle:{ color: COLORS.white, fontSize: FONTS.sizes['2xl'], fontWeight: '900' },
  confirmAmt:  { color: COLORS.white, fontSize: FONTS.sizes['4xl'], fontWeight: '900', marginTop: SPACING[2] },
  confirmPayer:{ color: 'rgba(255,255,255,0.7)', fontSize: FONTS.sizes.sm, marginTop: SPACING[1] },
  summaryRow:  { flexDirection: 'row', justifyContent: 'space-between', marginBottom: SPACING[3] },
  summaryKey:  { color: COLORS.text.muted, fontSize: FONTS.sizes.base },
  summaryVal:  { color: COLORS.text.primary, fontSize: FONTS.sizes.base, fontWeight: '600' },
  confirmSplitRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING[3], marginBottom: SPACING[3] },
  confirmSplitName:{ flex: 1, color: COLORS.text.primary, fontSize: FONTS.sizes.base },
  confirmSplitAmt: { color: COLORS.purple[300], fontSize: FONTS.sizes.base, fontWeight: '700' },
  decisionLabel:   { color: COLORS.text.secondary, fontSize: FONTS.sizes.base, textAlign: 'center', marginTop: SPACING[4], marginBottom: SPACING[3], fontWeight: '600' },
  decisionRow:     { flexDirection: 'row', gap: SPACING[3] },
});
