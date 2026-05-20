import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, ArrowRight, Check, Receipt, SplitSquareHorizontal, Plus, Trash2 } from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import { supabase, TABLES, CATEGORIES, SPLIT_TYPES } from '../../config/supabase';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../../config/theme';
import { StyledInput, GradientButton, GlassCard, Avatar, useAppAlert } from '../../components/UIComponents';
import { calculateEqualSplit, validateCustomSplit } from '../../utils/splitCalculator';

export default function AddExpenseScreen({ route, navigation }) {
  const { groupId, groupName, expenseId } = route.params || {};
  const isEdit = !!expenseId;
  const { user } = useAuth();
  const { showAlert } = useAppAlert();

  const [step,      setStep]     = useState(1);
  const [title,     setTitle]    = useState('');
  const [amount,    setAmount]   = useState('');
  const [category,  setCategory] = useState(CATEGORIES[0].id);
  const [date,      setDate]     = useState(new Date().toISOString().split('T')[0]);
  const [notes,     setNotes]    = useState('');
  
  // Payers array: [{ memberId, amount }]
  const [payers,    setPayers]   = useState([{ memberId: user.id, amount: '' }]);
  
  const [splitType, setSplitType]= useState(SPLIT_TYPES.EQUAL);
  const [members,   setMembers]  = useState([]);
  const [splits,    setSplits]   = useState({});
  const [loading,   setLoading]  = useState(false);

  useEffect(() => { loadMembers(); }, []);

  // When expense amount changes, if there is only one payer, auto-fill their amount
  useEffect(() => {
    if (payers.length === 1 && amount) {
      setPayers([{ ...payers[0], amount }]);
    }
  }, [amount]);

  async function loadMembers() {
    const { data } = await supabase
      .from(TABLES.GROUP_MEMBERS)
      .select('*, user:users(id, full_name, email)')
      .eq('group_id', groupId);
      
    const loadedMembers = (data || []).map(m => {
      if (m.user_id && m.user) {
        return { id: m.user.id, full_name: m.user.full_name || m.user.email?.split('@')[0] || 'User', email: m.user.email, is_guest: false, member_row_id: m.id };
      } else {
        return { id: `guest_${m.id}`, full_name: m.display_name || 'Guest', email: 'Guest (No Account)', is_guest: true, member_row_id: m.id };
      }
    });
    setMembers(loadedMembers);
  }

  function getEqualSplits() {
    return calculateEqualSplit(parseFloat(amount) || 0, members.map(m => m.id));
  }

  function getSplitData() {
    return splitType === SPLIT_TYPES.EQUAL
      ? getEqualSplits()
      : Object.fromEntries(Object.entries(splits).map(([k, v]) => [k, parseFloat(v) || 0]));
  }

  const addPayer = (memberId) => {
    if (payers.find(p => p.memberId === memberId)) {
      showAlert('Already Added', 'This person is already in the payer list.');
      return;
    }
    setPayers(prev => [...prev, { memberId, amount: '' }]);
  };

  const removePayer = (memberId) => {
    if (payers.length === 1) {
      showAlert('Required', 'There must be at least one payer.');
      return;
    }
    setPayers(prev => prev.filter(p => p.memberId !== memberId));
  };

  const updatePayerAmount = (memberId, amt) => {
    setPayers(prev => prev.map(p => p.memberId === memberId ? { ...p, amount: amt } : p));
  };

  async function handleSubmit() {
    const amt = parseFloat(amount);
    if (!title.trim() || !amt) { 
      showAlert('Missing Info', 'Please fill in title and amount.'); 
      return; 
    }

    // Validate Payers
    const totalPaid = payers.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
    if (Math.abs(totalPaid - amt) > 0.01) {
      showAlert('Invalid Payers', `The amounts paid by members must equal the total expense amount (P${amt.toFixed(2)}). Currently it is P${totalPaid.toFixed(2)}.`);
      return;
    }

    // Validate Splits
    if (splitType === SPLIT_TYPES.CUSTOM && !validateCustomSplit(amt, splits)) {
      showAlert('Invalid Split', 'Custom splits must add up to the total amount.'); 
      return;
    }

    setLoading(true);
    try {
      const splitData = getSplitData();
      
      // Determine the primary payer for backward compatibility
      const primaryPayer = payers.sort((a,b) => parseFloat(b.amount) - parseFloat(a.amount))[0];
      const primaryPayerMember = members.find(m => m.id === primaryPayer.memberId);
      const paidBy = (primaryPayerMember && !primaryPayerMember.is_guest) ? primaryPayerMember.id : null;

      const expenseData = { group_id: groupId, title: title.trim(), amount: amt, category, date, notes: notes.trim(), paid_by: paidBy, split_type: splitType };
      let existingSplits = [];
      let expId = expenseId;

      if (isEdit) {
        const { error: updErr } = await supabase.from(TABLES.EXPENSES).update(expenseData).eq('id', expId);
        if (updErr) throw updErr;
        
        const { data: oldSplits } = await supabase.from(TABLES.EXPENSE_SPLITS).select('*').eq('expense_id', expId);
        if (oldSplits) existingSplits = oldSplits;

        const { error: delSplitErr } = await supabase.from(TABLES.EXPENSE_SPLITS).delete().eq('expense_id', expId);
        if (delSplitErr) throw delSplitErr;
        
        const { error: delPayErr } = await supabase.from('expense_payments').delete().eq('expense_id', expId);
        if (delPayErr) throw delPayErr;
      } else {
        const { data, error: insErr } = await supabase.from(TABLES.EXPENSES).insert(expenseData).select().single();
        if (insErr) throw insErr;
        expId = data.id;
      }

      // Build expense_payments
      const paymentRows = payers.map(p => {
        const member = members.find(m => m.id === p.memberId);
        return {
          expense_id: expId,
          user_id: member.is_guest ? null : member.id,
          guest_member_id: member.is_guest ? member.member_row_id : null,
          amount: parseFloat(p.amount)
        };
      });
      const { error: payErr } = await supabase.from('expense_payments').insert(paymentRows);
      if (payErr) throw payErr;

      // Build expense_splits
      const splitRows = Object.entries(splitData).map(([uid, splitAmt]) => {
        const member = members.find(m => m.id === uid);
        if (!member) return null;

        const oldSplit = existingSplits.find(s => 
           (member.is_guest && s.guest_member_id === member.member_row_id) || 
           (!member.is_guest && s.user_id === uid)
        );
        
        const prevAmountPaid = oldSplit ? (parseFloat(oldSplit.amount_paid) || 0) : 0;
        const myInitialPayment = paymentRows.find(p => (member.is_guest && p.guest_member_id === member.member_row_id) || (!member.is_guest && p.user_id === uid))?.amount || 0;
        const totalCredited = myInitialPayment + prevAmountPaid;
        const isSettled = oldSplit?.is_settled || (totalCredited >= splitAmt);

        return { 
          expense_id: expId, 
          user_id: member.is_guest ? null : uid, 
          guest_member_id: member.is_guest ? member.member_row_id : null, 
          amount: splitAmt,
          amount_paid: prevAmountPaid,
          is_settled: isSettled,
          settled_at: oldSplit?.settled_at || null
        };
      }).filter(Boolean);

      const { error: splitErr } = await supabase.from(TABLES.EXPENSE_SPLITS).insert(splitRows);
      if (splitErr) throw splitErr;
      
      showAlert('Success', 'Expense saved successfully!', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (e) { 
      console.error(e);
      showAlert('Error', e.message || 'An error occurred while saving.'); 
    } finally { 
      setLoading(false); 
    }
  }

  const steps = [
    { label: 'Details', icon: <Receipt size={16} color={step >= 1 ? COLORS.babyPink : COLORS.lavender} strokeWidth={2} /> },
    { label: 'Split',   icon: <SplitSquareHorizontal size={16} color={step >= 2 ? COLORS.babyPink : COLORS.lavender} strokeWidth={2} /> },
    { label: 'Confirm', icon: <Check size={16} color={step >= 3 ? COLORS.babyPink : COLORS.lavender} strokeWidth={2} /> },
  ];

  return (
    <LinearGradient colors={['#1e0a30', '#130520']} style={styles.root}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        {/* Header */}
        <LinearGradient colors={['rgba(45,16,64,0.95)', 'transparent']} style={styles.header}>
          <TouchableOpacity onPress={() => step > 1 ? setStep(s => s - 1) : navigation.goBack()} style={styles.backBtn}>
            <ArrowLeft size={22} color={COLORS.white} strokeWidth={2} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{isEdit ? 'Edit Expense' : 'Add Expense'}</Text>
          <View style={{ width: 40 }} />
        </LinearGradient>

        {/* Step Indicator */}
        <View style={styles.stepRow}>
          {steps.map((s, i) => (
            <React.Fragment key={i}>
              <View style={styles.stepItem}>
                <View style={[styles.stepDot, step > i + 1 && styles.stepDotDone, step === i + 1 && styles.stepDotActive]}>
                  {step > i + 1 ? <Check size={12} color="#fff" strokeWidth={3} /> : s.icon}
                </View>
                <Text style={[styles.stepLabel, step === i + 1 && styles.stepLabelActive]}>{s.label}</Text>
              </View>
              {i < 2 && <View style={[styles.stepLine, step > i + 1 && styles.stepLineDone]} />}
            </React.Fragment>
          ))}
        </View>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

          {/* Step 1: Details */}
          {step === 1 && (
            <GlassCard style={styles.card}>
              <StyledInput label="Title" value={title} onChangeText={setTitle} placeholder="What was this for?" />
              <StyledInput label="Amount (P)" value={amount} onChangeText={setAmount} placeholder="0.00" keyboardType="decimal-pad" />
              <Text style={styles.fieldLabel}>CATEGORY</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
                {CATEGORIES.map(c => (
                  <TouchableOpacity key={c.id} onPress={() => setCategory(c.id)}
                    style={[styles.catChip, category === c.id && styles.catChipActive, category === c.id && { borderColor: c.color }]}>
                    <View style={[styles.catDot, { backgroundColor: c.color }]} />
                    <Text style={[styles.catLabel, category === c.id && { color: c.color }]}>{c.label}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <StyledInput label="Date" value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" />
              <StyledInput label="Notes (optional)" value={notes} onChangeText={setNotes} placeholder="Any additional notes..." multiline />
            </GlassCard>
          )}

          {/* Step 2: Split */}
          {step === 2 && (
            <View style={{ gap: SPACING[4] }}>
              {/* WHO PAID */}
              <GlassCard style={styles.card}>
                <Text style={styles.fieldLabel}>WHO PAID?</Text>
                
                {payers.map((payer, idx) => {
                  const member = members.find(m => m.id === payer.memberId);
                  return (
                    <View key={idx} style={styles.payerRow}>
                      <Avatar name={member?.full_name || ''} size={36} />
                      
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flex: 1, marginHorizontal: SPACING[2] }}>
                        {members.map(m => (
                          <TouchableOpacity key={m.id} onPress={() => {
                            setPayers(prev => prev.map((p, i) => i === idx ? { ...p, memberId: m.id } : p));
                          }}
                            style={[styles.memberChipSmall, payer.memberId === m.id && styles.memberChipSmallActive]}>
                            <Text style={[styles.memberChipSmallText, payer.memberId === m.id && { color: COLORS.white }]}>
                              {m.full_name?.split(' ')[0]}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>

                      <View style={styles.payerInputContainer}>
                        <StyledInput
                          value={payer.amount}
                          onChangeText={v => updatePayerAmount(payer.memberId, v)}
                          placeholder="0.00"
                          keyboardType="decimal-pad"
                          containerStyle={{ marginBottom: 0, width: 80 }}
                          inputStyle={{ paddingVertical: 8, textAlign: 'right' }}
                        />
                        <TouchableOpacity onPress={() => removePayer(payer.memberId)} style={styles.removePayerBtn}>
                          <Trash2 size={16} color={COLORS.lavender} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })}
                
                <TouchableOpacity onPress={() => addPayer(members[0].id)} style={styles.addPayerBtn}>
                  <Plus size={16} color={COLORS.babyPink} />
                  <Text style={styles.addPayerText}>Add Payer</Text>
                </TouchableOpacity>
              </GlassCard>

              {/* SPLIT METHOD */}
              <GlassCard style={styles.card}>
                <Text style={styles.fieldLabel}>HOW TO SPLIT</Text>
                <View style={styles.splitTypeRow}>
                  {[SPLIT_TYPES.EQUAL, SPLIT_TYPES.CUSTOM].map(t => (
                    <TouchableOpacity key={t} onPress={() => setSplitType(t)}
                      style={[styles.splitTypeBtn, splitType === t && styles.splitTypeBtnActive]}>
                      <SplitSquareHorizontal size={14} color={splitType === t ? COLORS.babyPink : COLORS.lavender} strokeWidth={2} />
                      <Text style={[styles.splitTypeText, splitType === t && { color: COLORS.babyPink }]}>{t.charAt(0).toUpperCase() + t.slice(1)}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {splitType === SPLIT_TYPES.CUSTOM && members.map(m => (
                  <View key={m.id} style={styles.customSplitRow}>
                    <Avatar name={m.full_name || ''} size={32} />
                    <Text style={styles.customSplitName}>{m.full_name?.split(' ')[0] || 'User'}</Text>
                    <StyledInput
                      value={splits[m.id] || ''}
                      onChangeText={v => setSplits(prev => ({ ...prev, [m.id]: v }))}
                      placeholder="0.00"
                      keyboardType="decimal-pad"
                      containerStyle={{ flex: 1, marginBottom: 0 }}
                    />
                  </View>
                ))}

                {splitType === SPLIT_TYPES.EQUAL && (
                  <View style={styles.equalPreview}>
                    <Text style={styles.equalPreviewText}>
                      Each person's share: {'\n'}P{((parseFloat(amount) || 0) / (members.length || 1)).toFixed(2)}
                    </Text>
                  </View>
                )}
              </GlassCard>
            </View>
          )}

          {/* Step 3: Confirm */}
          {step === 3 && (
            <GlassCard style={styles.card}>
              <Text style={styles.confirmTitle}>{title}</Text>
              <Text style={styles.confirmAmount}>P{parseFloat(amount).toFixed(2)}</Text>
              <View style={styles.confirmRow}>
                <Text style={styles.confirmLabel}>Category</Text>
                <Text style={styles.confirmValue}>{CATEGORIES.find(c => c.id === category)?.label}</Text>
              </View>
              
              <Text style={[styles.fieldLabel, { marginTop: SPACING[4] }]}>PAYERS</Text>
              {payers.map(p => {
                const member = members.find(m => m.id === p.memberId);
                return (
                  <View key={p.memberId} style={styles.splitPreviewRow}>
                    <Avatar name={member?.full_name || ''} size={24} />
                    <Text style={styles.splitPreviewName}>{member?.full_name?.split(' ')[0]}</Text>
                    <Text style={[styles.splitPreviewAmt, { color: COLORS.status.success }]}>+P{Number(p.amount).toFixed(2)}</Text>
                  </View>
                );
              })}

              <Text style={[styles.fieldLabel, { marginTop: SPACING[4] }]}>SPLITS</Text>
              {Object.entries(getSplitData()).map(([uid, amt]) => {
                const member = members.find(m => m.id === uid);
                return (
                  <View key={uid} style={styles.splitPreviewRow}>
                    <Avatar name={member?.full_name || ''} size={24} />
                    <Text style={styles.splitPreviewName}>{member?.full_name?.split(' ')[0]}</Text>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={styles.splitPreviewAmt}>-P{Number(amt).toFixed(2)}</Text>
                    </View>
                  </View>
                );
              })}
            </GlassCard>
          )}

          {/* Navigation Buttons */}
          <View style={styles.btnRow}>
            {step < 3 ? (
              <GradientButton
                title="Continue"
                onPress={() => {
                  if (step === 1 && (!title.trim() || !amount)) { showAlert('Missing Info', 'Please fill in title and amount.'); return; }
                  
                  if (step === 2) {
                     const amt = parseFloat(amount);
                     const totalPaid = payers.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
                     if (Math.abs(totalPaid - amt) > 0.01) {
                       showAlert('Invalid Payers', `The amounts paid by members must equal the total expense amount (P${amt.toFixed(2)}). Currently it is P${totalPaid.toFixed(2)}.`);
                       return;
                     }
                  }

                  setStep(s => s + 1);
                }}
                icon={<ArrowRight size={18} color="#fff" strokeWidth={2} />}
              />
            ) : (
              <GradientButton title={isEdit ? 'Save Changes' : 'Add Expense'} onPress={handleSubmit} loading={loading} icon={<Check size={18} color="#fff" strokeWidth={2.5} />} />
            )}
          </View>

          <View style={{ height: SPACING[10] }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root:               { flex: 1 },
  header:             { flexDirection: 'row', alignItems: 'center', padding: SPACING[5], paddingTop: SPACING[12] },
  backBtn:            { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle:        { flex: 1, color: COLORS.white, fontSize: FONTS.sizes.lg, fontWeight: '800', textAlign: 'center' },
  stepRow:            { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: SPACING[8], marginBottom: SPACING[4] },
  stepItem:           { alignItems: 'center', gap: 4 },
  stepDot:            { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,173,208,0.1)', borderWidth: 1.5, borderColor: COLORS.lavender, alignItems: 'center', justifyContent: 'center' },
  stepDotActive:      { borderColor: COLORS.babyPink, backgroundColor: 'rgba(255,173,208,0.15)' },
  stepDotDone:        { backgroundColor: COLORS.babyPink, borderColor: COLORS.babyPink },
  stepLabel:          { color: COLORS.lavender, fontSize: FONTS.sizes.xs, fontWeight: '600' },
  stepLabelActive:    { color: COLORS.babyPink },
  stepLine:           { flex: 1, height: 1.5, backgroundColor: 'rgba(255,173,208,0.2)', marginBottom: 16 },
  stepLineDone:       { backgroundColor: COLORS.babyPink },
  scroll:             { padding: SPACING[5], gap: SPACING[4] },
  card:               { gap: SPACING[3] },
  fieldLabel:         { color: COLORS.blush, fontSize: FONTS.sizes.xs, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase' },
  categoryScroll:     { marginVertical: SPACING[2] },
  catChip:            { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: SPACING[2], paddingHorizontal: SPACING[3], borderRadius: RADIUS.full, borderWidth: 1.5, borderColor: 'rgba(255,173,208,0.2)', marginRight: SPACING[2] },
  catChipActive:      { backgroundColor: 'rgba(255,173,208,0.1)' },
  catDot:             { width: 8, height: 8, borderRadius: 4 },
  catLabel:           { color: COLORS.lavender, fontSize: FONTS.sizes.xs, fontWeight: '600' },
  splitTypeRow:       { flexDirection: 'row', gap: SPACING[3] },
  splitTypeBtn:       { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, padding: SPACING[3], borderRadius: RADIUS.lg, borderWidth: 1.5, borderColor: 'rgba(255,173,208,0.2)' },
  splitTypeBtnActive: { borderColor: COLORS.babyPink, backgroundColor: 'rgba(255,173,208,0.1)' },
  splitTypeText:      { color: COLORS.lavender, fontSize: FONTS.sizes.sm, fontWeight: '600' },
  customSplitRow:     { flexDirection: 'row', alignItems: 'center', gap: SPACING[3] },
  customSplitName:    { color: COLORS.white, fontSize: FONTS.sizes.sm, fontWeight: '600', width: 60 },
  equalPreview:       { backgroundColor: 'rgba(255,173,208,0.1)', borderRadius: RADIUS.lg, padding: SPACING[4], alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,173,208,0.2)' },
  equalPreviewText:   { color: COLORS.white, fontSize: FONTS.sizes.base, fontWeight: '700', textAlign: 'center', lineHeight: 24 },
  confirmTitle:       { color: COLORS.white, fontSize: FONTS.sizes.xl, fontWeight: '800' },
  confirmAmount:      { color: COLORS.babyPink, fontSize: FONTS.sizes['3xl'], fontWeight: '900', marginBottom: SPACING[3] },
  confirmRow:         { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: SPACING[2], borderBottomWidth: 1, borderBottomColor: 'rgba(255,173,208,0.1)' },
  confirmLabel:       { color: COLORS.lavender, fontSize: FONTS.sizes.sm },
  confirmValue:       { color: COLORS.white,    fontSize: FONTS.sizes.sm, fontWeight: '600' },
  splitPreviewRow:    { flexDirection: 'row', alignItems: 'center', gap: SPACING[3], paddingVertical: SPACING[2] },
  splitPreviewName:   { flex: 1, color: COLORS.white, fontSize: FONTS.sizes.sm, fontWeight: '600' },
  splitPreviewAmt:    { color: COLORS.babyPink, fontSize: FONTS.sizes.sm, fontWeight: '700' },
  splitPreviewPartial:{ color: COLORS.lavender, fontSize: FONTS.sizes.xs, marginTop: 2 },
  btnRow:             { marginTop: SPACING[2] },

  // Payer Row Styles
  payerRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING[2], paddingVertical: SPACING[2], borderBottomWidth: 1, borderBottomColor: 'rgba(255,173,208,0.1)' },
  payerInputContainer: { flexDirection: 'row', alignItems: 'center', gap: SPACING[2] },
  removePayerBtn: { padding: 8 },
  addPayerBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: SPACING[3], borderRadius: RADIUS.md, backgroundColor: 'rgba(255,173,208,0.05)', borderWidth: 1, borderColor: 'rgba(255,173,208,0.15)' },
  addPayerText: { color: COLORS.babyPink, fontSize: FONTS.sizes.sm, fontWeight: '600' },
  memberChipSmall: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: RADIUS.full, backgroundColor: 'rgba(255,173,208,0.05)', marginRight: 8, borderWidth: 1, borderColor: 'transparent' },
  memberChipSmallActive: { backgroundColor: 'rgba(255,173,208,0.2)', borderColor: COLORS.babyPink },
  memberChipSmallText: { color: COLORS.lavender, fontSize: FONTS.sizes.xs, fontWeight: '600' },
});
