import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, Pencil, Trash2, CreditCard, CalendarDays, StickyNote, SplitSquareHorizontal, CheckCircle } from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import { supabase, TABLES, CATEGORIES } from '../../config/supabase';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../../config/theme';
import { LoadingScreen, GlassCard, Avatar, StyledInput, GradientButton, OutlineButton, useAppAlert } from '../../components/UIComponents';
import { formatCurrency } from '../../utils/splitCalculator';

export default function ExpenseDetailScreen({ route, navigation }) {
  const { expenseId } = route.params;
  const { user } = useAuth();
  const { showAlert } = useAppAlert();
  
  const [expense, setExpense] = useState(null);
  const [loading, setLoading] = useState(true);

  const [recordModalVisible, setRecordModalVisible] = useState(false);
  const [selectedPayerId, setSelectedPayerId] = useState('');
  const [amountPaidStr, setAmountPaidStr] = useState('');
  const [payingForId, setPayingForId] = useState('');

  useEffect(() => { fetchExpense(); }, []);

  async function fetchExpense() {
    const { data, error } = await supabase
      .from(TABLES.EXPENSES)
      .select('*, group:groups(name, created_by, currency), splits:expense_splits(*), payments:expense_payments(*)')
      .eq('id', expenseId)
      .single();
      
    if (error) {
      console.error('fetchExpense error:', error);
      showAlert('Error', 'Failed to load expense details.', [{ text: 'OK', onPress: () => navigation.goBack() }]);
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
      
      // Fetch all group members for unified mapping
      const { data: gmData } = await supabase
        .from(TABLES.GROUP_MEMBERS)
        .select('*, user:users(id, full_name, email)')
        .eq('group_id', data.group_id);

      const resolveMember = (userId, guestId) => {
        const member = gmData?.find(m => userId ? m.user_id === userId : m.id === guestId);
        return {
          displayName: member?.user?.full_name || member?.display_name || 'Guest',
          email: member?.user?.email || 'Guest (No Account)'
        };
      };

      if (data.splits) {
        data.splits = data.splits.map(s => ({ ...s, ...resolveMember(s.user_id, s.guest_member_id) }));
      }
      
      if (data.payments) {
        data.payments = data.payments.map(p => ({ ...p, ...resolveMember(p.user_id, p.guest_member_id) }));
      } else {
        // Fallback if no payments exist yet, use paid_by
        if (data.paid_by) {
            const payerMember = resolveMember(data.paid_by, null);
            data.payments = [{ user_id: data.paid_by, amount: data.amount, ...payerMember }];
        } else {
            data.payments = [];
        }
      }
    }
    
    setExpense(data);
    setLoading(false);
  }

  function closeRecordModal() {
    setRecordModalVisible(false);
    setSelectedPayerId('');
    setAmountPaidStr('');
    setPayingForId('');
  }

  async function handleAdvancedPayment(mode) {
    const payerSplit = expense.splits.find(s => s.user_id === selectedPayerId || s.guest_member_id === selectedPayerId);
    const amountPaid = parseFloat(amountPaidStr) || 0;
    
    if (!payerSplit) return;
    
    setLoading(true);
    try {
      if (mode === 'normal') {
         // Mark as settled
         await supabase.from(TABLES.EXPENSE_SPLITS).update({ is_settled: true, amount_paid: payerSplit.amount, settled_at: new Date().toISOString() }).eq('id', payerSplit.id);
      } else {
         const otherSplit = expense.splits.find(s => s.user_id === payingForId || s.guest_member_id === payingForId);
         if (!otherSplit) throw new Error('Other member not found');
         
         await supabase.from(TABLES.EXPENSE_SPLITS).update({ is_settled: true, amount_paid: payerSplit.amount, settled_at: new Date().toISOString() }).eq('id', payerSplit.id);
         await supabase.from(TABLES.EXPENSE_SPLITS).update({ is_settled: true, amount_paid: otherSplit.amount, settled_at: new Date().toISOString() }).eq('id', otherSplit.id);
         
         if (mode === 'transfer') {
            const { data: newExp, error: expErr } = await supabase.from(TABLES.EXPENSES).insert({
               group_id: expense.group_id,
               title: `Transfer: ${expense.title}`,
               amount: otherSplit.amount,
               category: 'others',
               paid_by: payerSplit.user_id, // Backward compatibility
               split_type: 'custom',
               created_by: user.id
            }).select().single();
            
            if (expErr) throw expErr;
            
            // Add payment record for the new expense
            await supabase.from('expense_payments').insert({
               expense_id: newExp.id,
               user_id: payerSplit.user_id,
               guest_member_id: payerSplit.guest_member_id,
               amount: otherSplit.amount
            });
            
            // Add split for the person who was paid for
            await supabase.from(TABLES.EXPENSE_SPLITS).insert({
               expense_id: newExp.id,
               user_id: otherSplit.user_id,
               guest_member_id: otherSplit.guest_member_id,
               amount: otherSplit.amount,
               is_settled: false
            });
         }
      }
      closeRecordModal();
      await fetchExpense();
    } catch (e) {
      showAlert('Error', e.message);
      setLoading(false);
    }
  }

  async function toggleSplitSettled(split) {
    const isGroupOwner = expense?.group?.created_by === user.id;
    if (!isGroupOwner) {
      showAlert('Permission Denied', 'Only the group owner is allowed to mark splits as paid.');
      return;
    }
    const newStatus = !split.is_settled;
    try {
      const { error } = await supabase
        .from(TABLES.EXPENSE_SPLITS)
        .update({ 
            is_settled: newStatus, 
            amount_paid: newStatus ? split.amount : 0,
            settled_at: newStatus ? new Date().toISOString() : null 
        })
        .eq('id', split.id);
      
      if (error) throw error;
      
      setExpense(prev => ({
        ...prev,
        splits: prev.splits.map(s => s.id === split.id ? { ...s, is_settled: newStatus, amount_paid: newStatus ? split.amount : 0 } : s)
      }));
    } catch (e) {
      showAlert('Error', e.message);
    }
  }

  async function handleDelete() {
    showAlert('Delete Expense', 'This will permanently delete this expense.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        await supabase.from(TABLES.EXPENSE_SPLITS).delete().eq('expense_id', expenseId);
        await supabase.from('expense_payments').delete().eq('expense_id', expenseId);
        await supabase.from(TABLES.EXPENSES).delete().eq('id', expenseId);
        navigation.goBack();
      }},
    ]);
  }

  if (loading || !expense) return <LoadingScreen message="Loading expense..." />;

  const category = CATEGORIES.find(c => c.id === expense.category) || CATEGORIES[CATEGORIES.length - 1];
  const mySplit  = expense.splits?.find(s => s.user_id === user.id);
  const myShare  = mySplit?.amount ?? 0;
  
  // Calculate my total paid
  const myPayments = expense.payments?.filter(p => p.user_id === user.id) || [];
  const myTotalPaid = myPayments.reduce((acc, p) => acc + p.amount, 0);
  
  // Balance: Negative means I owe money, Positive means I am owed money
  const myBalance = myTotalPaid - myShare;
  const isPayer = myTotalPaid > 0;
  const isMyShareSettled = mySplit?.is_settled || myBalance >= 0;

  return (
    <LinearGradient colors={['#1e0a30', '#130520']} style={styles.root}>
      {/* Header */}
      <LinearGradient colors={['rgba(45,16,64,0.95)', 'transparent']} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ArrowLeft size={22} color={COLORS.white} strokeWidth={2} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Expense Detail</Text>
        <View style={styles.headerActions}>
          {expense.group?.created_by === user.id && (
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

        {/* My Balance */}
        <GlassCard style={[styles.myShareCard, myBalance >= 0 && styles.myShareCardGreen]}>
          <View style={styles.myShareRow}>
            <View style={{ backgroundColor: 'transparent' }}>
              <Text style={styles.myShareLabel}>My Balance</Text>
              <Text style={[
                styles.myShareAmount, 
                { color: myBalance >= 0 ? COLORS.status.success : COLORS.status.error }
              ]}>
                {myBalance > 0 ? '+' : ''}{formatCurrency(myBalance, expense.group?.currency || 'PHP')}
              </Text>
            </View>
            <View style={[
              styles.payerBadge, 
              myBalance >= 0 ? styles.payerBadgeGreen : styles.payerBadgeRed
            ]}>
              {myBalance === 0 ? (
                <>
                  <CheckCircle size={14} color={COLORS.status.success} strokeWidth={2} />
                  <Text style={[styles.payerBadgeText, { color: COLORS.status.success }]}>Settled</Text>
                </>
              ) : myBalance > 0 ? (
                <>
                  <CreditCard size={14} color={COLORS.status.success} strokeWidth={2} />
                  <Text style={[styles.payerBadgeText, { color: COLORS.status.success }]}>You are owed</Text>
                </>
              ) : (
                <>
                  <CreditCard size={14} color={COLORS.status.error} strokeWidth={2} />
                  <Text style={[styles.payerBadgeText, { color: COLORS.status.error }]}>You owe</Text>
                </>
              )}
            </View>
          </View>
          <View style={styles.instructionBox}>
            <Text style={styles.instructionText}>
              {myBalance > 0 
                ? `You paid ${formatCurrency(myTotalPaid, expense.group?.currency)} and your share is ${formatCurrency(myShare, expense.group?.currency)}. You are owed ${formatCurrency(myBalance, expense.group?.currency)}.`
                : myBalance < 0 
                  ? `Your share is ${formatCurrency(myShare, expense.group?.currency)} and you've paid ${formatCurrency(myTotalPaid, expense.group?.currency)}. You still owe ${formatCurrency(Math.abs(myBalance), expense.group?.currency)}.`
                  : "You are completely settled up for this expense."}
            </Text>
          </View>
        </GlassCard>

        {/* Details */}
        <GlassCard style={styles.detailsCard}>
          <DetailRow icon={<CalendarDays size={16} color={COLORS.lavender} strokeWidth={2} />} label="Date"     value={expense.date ? new Date(expense.date).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' }) : '—'} />
          <DetailRow icon={<SplitSquareHorizontal size={16} color={COLORS.lavender} strokeWidth={2} />} label="Split"  value={expense.split_type} />
          {expense.notes && <DetailRow icon={<StickyNote size={16} color={COLORS.lavender} strokeWidth={2} />} label="Notes" value={expense.notes} />}
        </GlassCard>

        {/* Payers */}
        <GlassCard style={styles.splitsCard}>
          <Text style={styles.splitsTitle}>Who Paid Initially</Text>
          {(expense.payments || []).map((p, idx) => (
             <View key={idx} style={styles.splitRow}>
               <Avatar name={p.displayName || ''} size={36} />
               <View style={{ flex: 1 }}>
                 <Text style={styles.splitName}>{p.displayName}</Text>
               </View>
               <Text style={[styles.splitAmount, { color: COLORS.status.success }]}>+{formatCurrency(p.amount, expense.group?.currency || 'PHP')}</Text>
             </View>
          ))}
        </GlassCard>

        {/* Splits */}
        <GlassCard style={styles.splitsCard}>
          <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}}>
            <Text style={styles.splitsTitle}>How it's split</Text>
            {expense.group?.created_by === user.id && (
              <TouchableOpacity onPress={() => setRecordModalVisible(true)} style={styles.recordBtn}>
                <Text style={styles.recordBtnText}>Record Payment</Text>
              </TouchableOpacity>
            )}
          </View>
          
          <View style={styles.leaderBanner}>
            <Text style={styles.leaderBannerText}>
              👑 Creator: <Text style={styles.boldText}>{expense.group?.creator_name || 'Owner'}</Text>
            </Text>
            <Text style={styles.leaderBannerSub}>
              {expense.group?.created_by === user.id 
                ? "You are the Creator! Tap any split below to toggle its status." 
                : "Only the Creator is allowed to mark splits as paid."}
            </Text>
          </View>

          {(expense.splits || []).map(s => {
            const hasPartiallyPaid = s.amount_paid > 0 && s.amount_paid < s.amount;
            return (
              <View key={s.id} style={styles.splitRow}>
                <Avatar name={s.displayName || ''} size={36} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.splitName}>{s.displayName || 'User'}</Text>
                  <Text style={styles.splitSubtext}>
                    {s.is_settled 
                      ? "Fully Settled"
                      : hasPartiallyPaid
                        ? `Paid ${formatCurrency(s.amount_paid, expense.group?.currency)} / ${formatCurrency(s.amount, expense.group?.currency)}`
                        : "Owes their share"}
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
            )
          })}
        </GlassCard>

        <View style={{ height: SPACING[8] }} />
      </ScrollView>

      {/* Advanced Payment Modal */}
      <Modal visible={recordModalVisible} transparent animationType="slide" onRequestClose={closeRecordModal}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Record Payment</Text>
            
            <Text style={styles.modalLabel}>Who is paying?</Text>
            <ScrollView style={styles.dropdownList} nestedScrollEnabled>
              {expense.splits?.filter(s => !s.is_settled).map(s => {
                const identifier = s.user_id || s.guest_member_id;
                return (
                  <TouchableOpacity 
                    key={identifier} 
                    style={[styles.dropdownItem, selectedPayerId === identifier && styles.dropdownItemSelected]}
                    onPress={() => setSelectedPayerId(identifier)}
                  >
                    <Text style={[styles.dropdownItemText, selectedPayerId === identifier && styles.dropdownItemTextSelected]}>
                      {s.displayName} (Owes {formatCurrency(s.amount - (s.amount_paid || 0), expense.group?.currency || 'PHP')})
                    </Text>
                  </TouchableOpacity>
                );
              })}
              {expense.splits?.filter(s => !s.is_settled).length === 0 && (
                <Text style={{padding: SPACING[3], color: COLORS.lavender}}>Everyone is settled up!</Text>
              )}
            </ScrollView>

            {selectedPayerId !== '' && (
              <StyledInput 
                label="Amount Paid"
                value={amountPaidStr}
                onChangeText={setAmountPaidStr}
                keyboardType="numeric"
                placeholder="Enter amount"
              />
            )}

            {selectedPayerId !== '' && (() => {
              const payerSplit = expense.splits.find(s => s.user_id === selectedPayerId || s.guest_member_id === selectedPayerId);
              const amountPaid = parseFloat(amountPaidStr) || 0;
              const owes = (payerSplit?.amount || 0) - (payerSplit?.amount_paid || 0);
              const isOverpaying = amountPaid > owes;
              
              if (isOverpaying) {
                return (
                  <View>
                    <Text style={styles.modalLabel}>Paying for someone else?</Text>
                    <ScrollView style={styles.dropdownList} nestedScrollEnabled>
                      {expense.splits?.filter(s => !s.is_settled && s.user_id !== selectedPayerId && s.guest_member_id !== selectedPayerId).map(s => {
                        const identifier = s.user_id || s.guest_member_id;
                        return (
                          <TouchableOpacity 
                            key={identifier} 
                            style={[styles.dropdownItem, payingForId === identifier && styles.dropdownItemSelected]}
                            onPress={() => setPayingForId(identifier)}
                          >
                            <Text style={[styles.dropdownItemText, payingForId === identifier && styles.dropdownItemTextSelected]}>
                              {s.displayName} (Owes {formatCurrency(s.amount - (s.amount_paid || 0), expense.group?.currency || 'PHP')})
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>

                    {payingForId !== '' && (
                      <View style={styles.modalActions}>
                         <GradientButton title="Settle as Treat" onPress={() => handleAdvancedPayment('treat')} style={{flex:1, marginRight: 4}} textStyle={{fontSize: 12}} />
                         <GradientButton title="Transfer Debt" variant="secondary" onPress={() => handleAdvancedPayment('transfer')} style={{flex:1, marginLeft: 4}} textStyle={{fontSize: 12}} />
                      </View>
                    )}
                  </View>
                );
              } else {
                return (
                  <View style={styles.modalActions}>
                    <GradientButton title="Settle Payment" onPress={() => handleAdvancedPayment('normal')} style={{flex:1}} />
                  </View>
                );
              }
            })()}

            <OutlineButton title="Cancel" onPress={closeRecordModal} style={{marginTop: SPACING[4]}} />
          </View>
        </View>
      </Modal>
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
  splitsCard:     { marginHorizontal: SPACING[5], gap: SPACING[3], marginBottom: SPACING[3] },
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
  recordBtn:      { backgroundColor: 'rgba(255,173,208,0.15)', paddingHorizontal: SPACING[3], paddingVertical: 4, borderRadius: RADIUS.md },
  recordBtnText:  { color: COLORS.babyPink, fontSize: FONTS.sizes.xs, fontWeight: '700' },
  modalOverlay:   { flex: 1, backgroundColor: COLORS.overlay, justifyContent: 'center', padding: SPACING[5] },
  modalContent:   { backgroundColor: COLORS.background.card, padding: SPACING[5], borderRadius: RADIUS.xl, borderWidth: 1, borderColor: 'rgba(255,173,208,0.25)' },
  modalTitle:     { color: COLORS.white, fontSize: FONTS.sizes.xl, fontWeight: '800', marginBottom: SPACING[4], textAlign: 'center' },
  modalLabel:     { color: COLORS.blush, fontSize: FONTS.sizes.sm, fontWeight: '600', marginBottom: SPACING[2], textTransform: 'uppercase' },
  dropdownList:   { maxHeight: 120, marginBottom: SPACING[4], borderWidth: 1, borderColor: 'rgba(255,173,208,0.2)', borderRadius: RADIUS.md },
  dropdownItem:   { padding: SPACING[3], borderBottomWidth: 1, borderBottomColor: 'rgba(255,173,208,0.1)' },
  dropdownItemSelected: { backgroundColor: 'rgba(255,173,208,0.15)' },
  dropdownItemText: { color: COLORS.lavender, fontSize: FONTS.sizes.sm },
  dropdownItemTextSelected: { color: COLORS.babyPink, fontWeight: '700' },
  modalActions:   { flexDirection: 'row', justifyContent: 'space-between', marginTop: SPACING[2] },
});
