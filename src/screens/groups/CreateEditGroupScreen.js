import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, UserPlus, X, Users, Save, Globe } from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import { supabase, TABLES } from '../../config/supabase';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../../config/theme';
import { StyledInput, GradientButton, Avatar, GlassCard } from '../../components/UIComponents';

const CURRENCIES = [
  { code: 'PHP', symbol: '₱', label: 'Philippine Peso (₱)' },
  { code: 'USD', symbol: '$', label: 'US Dollar ($)' },
  { code: 'EUR', symbol: '€', label: 'Euro (€)' },
  { code: 'SGD', symbol: 'S$', label: 'Singapore Dollar (S$)' },
  { code: 'JPY', symbol: '¥', label: 'Japanese Yen (¥)' },
];

export default function CreateEditGroupScreen({ route, navigation }) {
  const { group } = route.params || {};
  const isEdit = !!group;
  const { user } = useAuth();

  const [name,        setName]        = useState(group?.name        || '');
  const [description, setDescription] = useState(group?.description || '');
  const [currency,    setCurrency]    = useState(group?.currency    || 'PHP');
  
  // Member additions
  const [addMode,     setAddMode]     = useState('account'); // 'account' or 'guest'
  const [memberEmail, setMemberEmail] = useState('');
  const [guestName,   setGuestName]   = useState('');
  const [members,     setMembers]     = useState([]);
  const [loading,     setLoading]     = useState(false);
  const [errors,      setErrors]      = useState({});

  useEffect(() => {
    if (isEdit) loadCurrentMembers();
  }, []);

  async function loadCurrentMembers() {
    const { data } = await supabase
      .from(TABLES.GROUP_MEMBERS)
      .select('*, user:users(id, full_name, email)')
      .eq('group_id', group.id);
    
    setMembers((data || []).map(m => {
      if (m.user) {
        return { id: m.user.id, full_name: m.user.full_name, email: m.user.email, is_guest: false };
      } else {
        return { id: m.id, full_name: m.display_name, email: 'Guest (No Account)', is_guest: true };
      }
    }));
  }

  async function handleAddMember() {
    const email = memberEmail.trim().toLowerCase();
    if (!email) return;
    if (members.find(m => m.email === email)) {
      Alert.alert('Already added', 'This person is already in the group.');
      return;
    }
    const { data, error } = await supabase.from(TABLES.USERS).select('id, full_name, email').eq('email', email).maybeSingle();
    if (error) { Alert.alert('Error', error.message); return; }
    if (!data || !data.id) { Alert.alert('Not found', 'No Splitzy account found for that email.'); return; }
    if (user && data.id === user.id) { Alert.alert('That\'s you!', 'You\'re added automatically.'); return; }
    setMembers(prev => [...prev, { ...data, is_guest: false }]);
    setMemberEmail('');
  }

  function handleAddGuest() {
    const nameStr = guestName.trim();
    if (!nameStr) return;
    if (members.find(m => m.full_name.toLowerCase() === nameStr.toLowerCase())) {
      Alert.alert('Already added', 'A member with this name is already in the group.');
      return;
    }
    const tempId = 'guest_' + Math.random().toString(36).substring(2, 9);
    setMembers(prev => [...prev, { id: tempId, full_name: nameStr, email: 'Guest (No Account)', is_guest: true }]);
    setGuestName('');
  }

  async function handleSubmit() {
    if (!user) { Alert.alert('Session expired', 'Please sign out and sign in again.'); return; }
    if (!name.trim()) { setErrors({ name: 'Group name is required' }); return; }
    setLoading(true);
    try {
      if (isEdit) {
        // Update group info
        const { error: groupUpdateErr } = await supabase
          .from(TABLES.GROUPS)
          .update({ name: name.trim(), description: description.trim(), currency })
          .eq('id', group.id);
        
        if (groupUpdateErr) throw groupUpdateErr;

        // Fetch current members
        const { data: existingMembers, error: fetchErr } = await supabase
          .from(TABLES.GROUP_MEMBERS)
          .select('*')
          .eq('group_id', group.id);
        
        if (fetchErr) throw fetchErr;

        // 1. Delete removed members
        const toDelete = existingMembers?.filter(em => {
          if (em.user_id === null) {
            return !members.some(m => m.is_guest && m.full_name === em.display_name);
          } else {
            return !members.some(m => !m.is_guest && m.id === em.user_id);
          }
        });

        if (toDelete && toDelete.length > 0) {
          const deleteIds = toDelete.map(em => em.id);
          const { error: deleteErr } = await supabase
            .from(TABLES.GROUP_MEMBERS)
            .delete()
            .in('id', deleteIds);
          
          if (deleteErr) throw deleteErr;
        }

        // 2. Insert newly added members
        const newMembers = members.filter(m => {
          if (m.is_guest) {
            return !existingMembers?.some(em => em.user_id === null && em.display_name === m.full_name);
          } else {
            return !existingMembers?.some(em => em.user_id === m.id);
          }
        });

        if (newMembers.length > 0) {
          const { error: insertErr } = await supabase
            .from(TABLES.GROUP_MEMBERS)
            .insert(
              newMembers.map(m => ({
                group_id: group.id,
                user_id: m.is_guest ? null : m.id,
                display_name: m.is_guest ? m.full_name : null,
                role: 'member'
              }))
            );
          
          if (insertErr) throw insertErr;
        }
      } else {
        const { data: newGroup, error: groupError } = await supabase.from(TABLES.GROUPS)
          .insert({ name: name.trim(), description: description.trim(), created_by: user.id, currency }).select().single();
        
        if (groupError) throw groupError;
        if (!newGroup) throw new Error('Failed to create group');

        const allMembers = [
          { group_id: newGroup.id, user_id: user.id, role: 'admin', display_name: null },
          ...members.map(m => ({
            group_id: newGroup.id,
            user_id: m.is_guest ? null : m.id,
            display_name: m.is_guest ? m.full_name : null,
            role: 'member'
          }))
        ];
        
        const { error: memberError } = await supabase.from(TABLES.GROUP_MEMBERS).insert(allMembers);
        if (memberError) throw memberError;
      }
      navigation.goBack();
    } catch (e) { Alert.alert('Error', e.message); }
    finally { setLoading(false); }
  }

  return (
    <LinearGradient colors={['#1e0a30', '#130520']} style={styles.root}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        {/* Header */}
        <LinearGradient colors={['rgba(45,16,64,0.95)', 'transparent']} style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <ArrowLeft size={22} color={COLORS.white} strokeWidth={2} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{isEdit ? 'Edit Group' : 'New Group'}</Text>
          <View style={{ width: 40 }} />
        </LinearGradient>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {/* Group Info */}
          <GlassCard style={styles.card}>
            <View style={styles.groupIconPreview}>
              <LinearGradient colors={['#9b59d0', '#ffadd0']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.groupIconBg}>
                <Users size={32} color="#fff" strokeWidth={1.8} />
              </LinearGradient>
            </View>
            <StyledInput label="Group Name" value={name} onChangeText={setName} placeholder="e.g. Barkada Trip" error={errors.name} />
            <StyledInput label="Description (optional)" value={description} onChangeText={setDescription} placeholder="What's this group for?" multiline numberOfLines={2} />
          </GlassCard>

          {/* Group Currency */}
          <GlassCard style={styles.card}>
            <View style={styles.sectionHeaderRow}>
              <Globe size={16} color={COLORS.babyPink} strokeWidth={2} />
              <Text style={styles.cardLabel}>GROUP CURRENCY</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.currencySelector}>
              {CURRENCIES.map(curr => (
                <TouchableOpacity
                  key={curr.code}
                  onPress={() => setCurrency(curr.code)}
                  style={[styles.currencyBtn, currency === curr.code && styles.currencyBtnActive]}
                >
                  <Text style={[styles.currencyBtnText, currency === curr.code && styles.currencyBtnTextActive]}>
                    {curr.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </GlassCard>

          {/* Add Members */}
          <GlassCard style={styles.card}>
            <Text style={styles.cardLabel}>ADD MEMBERS</Text>
            
            {/* Dual option tab buttons */}
            <View style={styles.tabContainer}>
              <TouchableOpacity
                onPress={() => setAddMode('account')}
                style={[styles.tabBtn, addMode === 'account' && styles.tabBtnActive]}
              >
                <Text style={[styles.tabBtnText, addMode === 'account' && styles.tabBtnTextActive]}>By Account</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setAddMode('guest')}
                style={[styles.tabBtn, addMode === 'guest' && styles.tabBtnActive]}
              >
                <Text style={[styles.tabBtnText, addMode === 'guest' && styles.tabBtnTextActive]}>As Guest</Text>
              </TouchableOpacity>
            </View>

            {addMode === 'account' ? (
              <View style={styles.addMemberRow}>
                <StyledInput
                  value={memberEmail}
                  onChangeText={setMemberEmail}
                  placeholder="member@email.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  containerStyle={{ flex: 1, marginBottom: 0 }}
                  onSubmitEditing={handleAddMember}
                />
                <TouchableOpacity onPress={handleAddMember} style={[styles.addBtn, SHADOWS.sm]}>
                  <LinearGradient colors={['#9b59d0', '#ffadd0']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.addBtnGrad}>
                    <UserPlus size={18} color="#fff" strokeWidth={2} />
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.addMemberRow}>
                <StyledInput
                  value={guestName}
                  onChangeText={setGuestName}
                  placeholder="Enter guest name"
                  containerStyle={{ flex: 1, marginBottom: 0 }}
                  onSubmitEditing={handleAddGuest}
                />
                <TouchableOpacity onPress={handleAddGuest} style={[styles.addBtn, SHADOWS.sm]}>
                  <LinearGradient colors={['#9b59d0', '#ffadd0']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.addBtnGrad}>
                    <UserPlus size={18} color="#fff" strokeWidth={2} />
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            )}

            {members.length > 0 && (
              <View style={styles.membersList}>
                {members.map((m, i) => (
                  <View key={i} style={styles.memberRow}>
                    <Avatar name={m.full_name || m.email} size={36} />
                    <View style={styles.memberInfo}>
                      <Text style={styles.memberName}>{m.full_name || 'User'}</Text>
                      <Text style={styles.memberEmail}>{m.email}</Text>
                    </View>
                    <TouchableOpacity onPress={() => setMembers(prev => prev.filter((_, idx) => idx !== i))}>
                      <X size={18} color={COLORS.status.error} strokeWidth={2} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </GlassCard>

          <GradientButton
            title={isEdit ? 'Save Changes' : 'Create Group'}
            onPress={handleSubmit}
            loading={loading}
            icon={<Save size={18} color="#fff" strokeWidth={2} />}
            style={{ marginHorizontal: SPACING[5] }}
          />

          <View style={{ height: SPACING[10] }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root:             { flex: 1 },
  header:           { flexDirection: 'row', alignItems: 'center', padding: SPACING[5], paddingTop: SPACING[12] },
  backBtn:          { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle:      { flex: 1, color: COLORS.white, fontSize: FONTS.sizes.lg, fontWeight: '800', textAlign: 'center' },
  scroll:           { padding: SPACING[5], gap: SPACING[4] },
  card:             { gap: SPACING[3] },
  groupIconPreview: { alignItems: 'center', marginBottom: SPACING[2] },
  groupIconBg:      { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  cardLabel:        { color: COLORS.blush, fontSize: FONTS.sizes.xs, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase' },
  
  // Currency Selector
  currencySelector: { gap: SPACING[2], paddingVertical: 4 },
  currencyBtn:      { paddingHorizontal: SPACING[4], paddingVertical: 8, borderRadius: RADIUS.lg, backgroundColor: 'rgba(255,173,208,0.05)', borderWidth: 1, borderColor: 'rgba(255,173,208,0.15)' },
  currencyBtnActive:{ backgroundColor: COLORS.babyPink, borderColor: COLORS.babyPink },
  currencyBtnText:  { color: COLORS.lavender, fontSize: FONTS.sizes.sm, fontWeight: '600' },
  currencyBtnTextActive: { color: '#fff', fontWeight: '700' },

  // Tabs
  tabContainer:     { flexDirection: 'row', backgroundColor: 'rgba(255,173,208,0.05)', borderRadius: RADIUS.lg, padding: 4, marginBottom: 4 },
  tabBtn:           { flex: 1, paddingVertical: SPACING[2], alignItems: 'center', borderRadius: RADIUS.md },
  tabBtnActive:     { backgroundColor: 'rgba(255,173,208,0.15)' },
  tabBtnText:       { color: COLORS.lavender, fontSize: FONTS.sizes.sm, fontWeight: '600' },
  tabBtnTextActive: { color: COLORS.babyPink, fontWeight: '700' },

  addMemberRow:     { flexDirection: 'row', alignItems: 'center', gap: SPACING[3] },
  addBtn:           { borderRadius: RADIUS.lg, overflow: 'hidden' },
  addBtnGrad:       { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  membersList:      { gap: SPACING[3], marginTop: SPACING[3] },
  memberRow:        { flexDirection: 'row', alignItems: 'center', gap: SPACING[3] },
  memberInfo:       { flex: 1 },
  memberName:       { color: COLORS.white,    fontSize: FONTS.sizes.base, fontWeight: '600' },
  memberEmail:      { color: COLORS.lavender, fontSize: FONTS.sizes.xs },
});