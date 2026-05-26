import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, FlatList } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { ArrowLeft, Pencil, Trash2, Plus, Users, Receipt, UserMinus } from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import { supabase, TABLES } from '../../config/supabase';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../../config/theme';
import { LoadingScreen, Avatar, GlassCard, SectionHeader, useAppAlert } from '../../components/UIComponents';
import { ExpenseCard } from '../../components/Cards';
import { formatCurrency } from '../../utils/splitCalculator';

export default function GroupDetailScreen({ route, navigation }) {
  const { groupId, groupName } = route.params;
  const { user } = useAuth();
  const { showAlert } = useAppAlert();

  const [group,    setGroup]    = useState(null);
  const [members,  setMembers]  = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [isAdmin,  setIsAdmin]  = useState(false);

  useFocusEffect(useCallback(() => { loadAll(); }, []));

  async function loadAll() {
    try { await Promise.all([fetchGroup(), fetchMembers(), fetchExpenses()]); }
    finally { setLoading(false); }
  }

  async function fetchGroup() {
    const { data } = await supabase.from(TABLES.GROUPS).select('*').eq('id', groupId).single();
    setGroup(data);
  }

  async function fetchMembers() {
    const { data } = await supabase
      .from(TABLES.GROUP_MEMBERS)
      .select('*, user:users(id, full_name, email)')
      .eq('group_id', groupId);
    setMembers(data || []);
    setIsAdmin(data?.find(m => m.user_id === user.id)?.role === 'admin');
  }

  async function fetchExpenses() {
    const { data, error } = await supabase
      .from(TABLES.EXPENSES)
      .select('*, splits:expense_splits(*), payments:expense_payments(*)')
      .eq('group_id', groupId)
      .order('date', { ascending: false });
      
    if (error) {
      console.error('fetchExpenses error:', error.message);
      showAlert('Error loading expenses', error.message);
    }
    
    // Manual fetch for users
    // Payer is now determined by the first payment, or paid_by fallback
    const payerIds = [...new Set((data || []).flatMap(e => {
      if (e.payments && e.payments.length > 0) return e.payments.map(p => p.user_id);
      return [e.paid_by];
    }))].filter(Boolean);

    const { data: usersData } = await supabase.from(TABLES.USERS).select('id, full_name').in('id', payerIds);
    const usersMap = Object.fromEntries((usersData || []).map(u => [u.id, u.full_name]));

    setExpenses((data || []).map(e => {
      let payerName = usersMap[e.paid_by];
      if (e.payments && e.payments.length > 0) {
         if (e.payments.length === 1) {
             payerName = usersMap[e.payments[0].user_id] || 'Guest';
         } else {
             payerName = 'Multiple';
         }
      }
      return { ...e, payer_name: payerName };
    }));
  }

  async function handleDeleteGroup() {
    showAlert('Delete Group', 'This will permanently delete the group and all its expenses.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          const expIds = expenses.map(e => e.id);
          if (expIds.length) {
            await supabase.from(TABLES.EXPENSE_SPLITS).delete().in('expense_id', expIds);
            await supabase.from('expense_payments').delete().in('expense_id', expIds);
            await supabase.from(TABLES.EXPENSES).delete().in('id', expIds);
          }
          await supabase.from(TABLES.GROUP_MEMBERS).delete().eq('group_id', groupId);
          await supabase.from(TABLES.GROUPS).delete().eq('id', groupId);
          navigation.goBack();
        } catch (e) { showAlert('Error', e.message); }
      }},
    ]);
  }

  if (loading) return <LoadingScreen message="Loading group..." />;

  const myBalance = (() => {
    let b = 0;
    for (const exp of expenses) {
      if (exp.paid_by === user.id) {
        // I paid: others owe me their unsettled shares
        const othersUnsettled = (exp.splits || [])
          .filter(s => s.user_id !== user.id && !s.is_settled)
          .reduce((a, s) => a + s.amount, 0);
        b += othersUnsettled;
      } else {
        // Someone else paid: I owe my unsettled share
        const mySplit = (exp.splits || []).find(s => s.user_id === user.id);
        if (mySplit && !mySplit.is_settled) {
          b -= mySplit.amount;
        }
      }
    }
    return b;
  })();

  return (
    <LinearGradient colors={['#1e0a30', '#130520']} style={styles.root}>
      {/* Header */}
      <LinearGradient colors={['rgba(45,16,64,0.95)', 'transparent']} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ArrowLeft size={22} color={COLORS.white} strokeWidth={2} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{group?.name || groupName}</Text>
        <View style={styles.headerActions}>
          {isAdmin && (
            <>
              <TouchableOpacity onPress={() => navigation.navigate('EditGroup', { group })} style={styles.headerBtn}>
                <Pencil size={18} color={COLORS.lavender} strokeWidth={2} />
              </TouchableOpacity>
              <TouchableOpacity onPress={handleDeleteGroup} style={styles.headerBtn}>
                <Trash2 size={18} color={COLORS.status.error} strokeWidth={2} />
              </TouchableOpacity>
            </>
          )}
        </View>
      </LinearGradient>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Balance Hero */}
        <LinearGradient
          colors={myBalance >= 0 ? ['#7b1fa2', '#ffadd0'] : ['#991b1b', '#dc2626']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={[styles.balanceCard, SHADOWS.glow]}
        >
          <View style={styles.balanceShimmer} />
          <Text style={styles.balanceLabel}>Your Balance</Text>
          <Text style={styles.balanceAmount}>{myBalance >= 0 ? '+' : ''}{formatCurrency(myBalance, group?.currency || 'PHP')}</Text>
          <Text style={styles.balanceSub}>{myBalance >= 0 ? 'You are owed money' : 'You owe money'}</Text>
        </LinearGradient>

        {/* Members */}
        <View style={styles.section}>
          <SectionHeader
            title={`Members (${members.length})`}
            action={isAdmin ? () => navigation.navigate('EditGroup', { group }) : null}
            actionLabel="Manage"
          />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.membersRow}>
            {members.map(m => {
              const displayName = m.user?.full_name || m.display_name || 'Guest';
              const nameToShow = displayName.split(' ')[0];
              return (
                <View key={m.id} style={styles.memberChip}>
                  <Avatar name={displayName} size={44} />
                  <Text style={styles.memberName} numberOfLines={1}>{nameToShow}</Text>
                  {m.role === 'admin' && <Text style={styles.adminBadge}>Creator</Text>}
                </View>
              );
            })}
          </ScrollView>
        </View>

        {/* Expenses */}
        <View style={styles.section}>
          <SectionHeader
            title={`Expenses (${expenses.length})`}
            action={() => navigation.navigate('AddExpense', { groupId, groupName: group?.name })}
            actionLabel="Add"
          />
          {expenses.length === 0 ? (
            <GlassCard style={styles.emptyCard}>
              <Receipt size={32} color={COLORS.lavender} strokeWidth={1.5} />
              <Text style={styles.emptyText}>No expenses yet</Text>
              <TouchableOpacity onPress={() => navigation.navigate('AddExpense', { groupId, groupName: group?.name })}>
                <Text style={styles.emptyAction}>Add the first expense</Text>
              </TouchableOpacity>
            </GlassCard>
          ) : (
            expenses.map(e => (
              <ExpenseCard key={e.id} expense={e} currentUserId={user.id} currency={group?.currency || 'PHP'}
                onPress={() => navigation.navigate('ExpenseDetail', { expenseId: e.id })} />
            ))
          )}
        </View>

        <View style={{ height: SPACING[8] }} />
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity
        style={[styles.fab, SHADOWS.glow]}
        onPress={() => navigation.navigate('AddExpense', { groupId, groupName: group?.name })}
      >
        <LinearGradient colors={['#9b59d0', '#ffadd0']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.fabGrad}>
          <Plus size={28} color="#fff" strokeWidth={2.5} />
        </LinearGradient>
      </TouchableOpacity>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root:           { flex: 1 },
  header:         { flexDirection: 'row', alignItems: 'center', padding: SPACING[5], paddingTop: SPACING[12] },
  backBtn:        { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle:    { flex: 1, color: COLORS.white, fontSize: FONTS.sizes.lg, fontWeight: '800', marginHorizontal: SPACING[2] },
  headerActions:  { flexDirection: 'row', gap: SPACING[2] },
  headerBtn:      { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,173,208,0.1)', alignItems: 'center', justifyContent: 'center' },
  balanceCard:    { margin: SPACING[5], borderRadius: RADIUS['2xl'], padding: SPACING[6], alignItems: 'center', overflow: 'hidden' },
  balanceShimmer: { position: 'absolute', top: 0, left: 0, right: 0, height: '50%', backgroundColor: 'rgba(255,255,255,0.07)' },
  balanceLabel:   { color: 'rgba(255,255,255,0.8)', fontSize: FONTS.sizes.xs, fontWeight: '700', letterSpacing: 2, textTransform: 'uppercase', marginBottom: SPACING[2] },
  balanceAmount:  { color: '#fff', fontSize: FONTS.sizes['4xl'], fontWeight: '900', letterSpacing: -1 },
  balanceSub:     { color: 'rgba(255,255,255,0.7)', fontSize: FONTS.sizes.sm, marginTop: SPACING[1] },
  section:        { paddingHorizontal: SPACING[5], marginBottom: SPACING[5] },
  membersRow:     { gap: SPACING[3], paddingVertical: SPACING[2] },
  memberChip:     { alignItems: 'center', width: 64 },
  memberName:     { color: COLORS.white, fontSize: FONTS.sizes.xs, marginTop: SPACING[1], fontWeight: '600', textAlign: 'center' },
  adminBadge:     { color: COLORS.babyPink, fontSize: 9, fontWeight: '700', marginTop: 2 },
  emptyCard:      { alignItems: 'center', padding: SPACING[6], gap: SPACING[3] },
  emptyText:      { color: COLORS.lavender, fontSize: FONTS.sizes.base },
  emptyAction:    { color: COLORS.babyPink, fontSize: FONTS.sizes.sm, fontWeight: '700' },
  fab:            { position: 'absolute', bottom: SPACING[8], right: SPACING[6], width: 60, height: 60, borderRadius: 30 },
  fabGrad:        { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center' },
});
