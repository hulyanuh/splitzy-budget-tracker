import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Switch, Modal, TextInput } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { Pencil, Lock, Bell, Users, Receipt, CheckCircle, LogOut, ChevronRight, X, Check } from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import { supabase, TABLES } from '../../config/supabase';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../../config/theme';
import { StyledInput, Avatar } from '../../components/UIComponents';

export default function SettingsScreen({ navigation }) {
  const { user, profile, updateProfile, signOut } = useAuth();
  const [editing,      setEditing]      = useState(false);
  const [fullName,     setFullName]     = useState(profile?.full_name || '');
  const [saving,       setSaving]       = useState(false);
  const [notifications,setNotifications]= useState(true);

  // Stats
  const [groupCount,   setGroupCount]   = useState(0);
  const [expenseCount, setExpenseCount] = useState(0);
  const [settledCount, setSettledCount] = useState(0);

  // Password change modal
  const [showPwModal,  setShowPwModal]  = useState(false);
  const [currentPw,    setCurrentPw]    = useState('');
  const [newPw,        setNewPw]        = useState('');
  const [confirmPw,    setConfirmPw]    = useState('');
  const [pwLoading,    setPwLoading]    = useState(false);

  useFocusEffect(useCallback(() => { if (user) fetchStats(); }, [user]));

  async function fetchStats() {
    try {
      // Count groups
      const { count: gc } = await supabase
        .from(TABLES.GROUP_MEMBERS)
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);
      setGroupCount(gc || 0);

      // Count expenses the user paid for
      const { count: ec } = await supabase
        .from(TABLES.EXPENSES)
        .select('*', { count: 'exact', head: true })
        .eq('paid_by', user.id);
      setExpenseCount(ec || 0);

      // Count settled splits
      const { count: sc } = await supabase
        .from(TABLES.EXPENSE_SPLITS)
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_settled', true);
      setSettledCount(sc || 0);
    } catch (e) {
      console.error('fetchStats error:', e);
    }
  }

  async function handleSave() {
    if (!fullName.trim()) return;
    setSaving(true);
    try {
      await updateProfile({ full_name: fullName.trim() });
      setEditing(false);
      Alert.alert('Updated', 'Profile updated successfully!');
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleChangePassword() {
    if (!currentPw || !newPw || !confirmPw) {
      Alert.alert('Missing Fields', 'Please fill in all password fields.');
      return;
    }
    if (newPw.length < 6) {
      Alert.alert('Too Short', 'New password must be at least 6 characters.');
      return;
    }
    if (newPw !== confirmPw) {
      Alert.alert('Mismatch', 'New passwords do not match.');
      return;
    }
    setPwLoading(true);
    try {
      // Verify current password by re-authenticating
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPw,
      });
      if (signInError) {
        Alert.alert('Wrong Password', 'Your current password is incorrect.');
        setPwLoading(false);
        return;
      }

      // Update to new password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPw,
      });
      if (updateError) throw updateError;

      Alert.alert('Success', 'Password changed successfully!');
      setShowPwModal(false);
      setCurrentPw('');
      setNewPw('');
      setConfirmPw('');
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setPwLoading(false);
    }
  }

  async function handleSignOut() {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: async () => {
        try { await signOut(); } catch (e) { Alert.alert('Error', e.message); }
      }},
    ]);
  }

  return (
    <LinearGradient colors={['#1e0a30', '#130520']} style={styles.root}>
      <ScrollView showsVerticalScrollIndicator={false}>

        {/* Profile Hero */}
        <LinearGradient colors={['#7b1fa2', '#ffadd0']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
          <View style={styles.heroShimmer} />
          <Avatar name={profile?.full_name || user?.email || ''} size={80} style={styles.avatar} />
          {editing ? (
            <View style={styles.editNameRow}>
              <StyledInput
                value={fullName}
                onChangeText={setFullName}
                placeholder="Your name"
                style={styles.nameInput}
                containerStyle={{ marginBottom: 0, flex: 1 }}
              />
              <TouchableOpacity onPress={handleSave} disabled={saving} style={styles.saveBtn}>
                <Check size={20} color="#fff" strokeWidth={2.5} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setEditing(false)} style={styles.cancelBtn}>
                <X size={20} color="rgba(255,255,255,0.7)" strokeWidth={2.5} />
              </TouchableOpacity>
            </View>
          ) : (
            <Text style={styles.heroName}>{profile?.full_name || 'Set your name'}</Text>
          )}
          <Text style={styles.heroEmail}>{user?.email}</Text>
          {!editing && (
            <TouchableOpacity style={styles.editBtn} onPress={() => { setEditing(true); setFullName(profile?.full_name || ''); }}>
              <Pencil size={14} color="#7b1fa2" strokeWidth={2.5} />
              <Text style={styles.editBtnText}>Edit Profile</Text>
            </TouchableOpacity>
          )}
        </LinearGradient>

        {/* Account */}
        <Text style={styles.sectionLabel}>ACCOUNT</Text>
        <View style={styles.section}>
          <SettingRow
            icon={<Lock size={18} color={COLORS.lavender} strokeWidth={1.8} />}
            label="Change Password"
            onPress={() => setShowPwModal(true)}
          />
        </View>

        {/* Preferences */}
        <Text style={styles.sectionLabel}>PREFERENCES</Text>
        <View style={styles.section}>
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <View style={styles.rowIcon}>
                <Bell size={18} color={COLORS.lavender} strokeWidth={1.8} />
              </View>
              <Text style={styles.rowLabel}>Notifications</Text>
            </View>
            <Switch
              value={notifications}
              onValueChange={setNotifications}
              trackColor={{ false: '#3d1a50', true: COLORS.babyPink }}
              thumbColor="#fff"
            />
          </View>
        </View>

        {/* Stats */}
        <Text style={styles.sectionLabel}>YOUR STATS</Text>
        <View style={styles.statsRow}>
          <StatCard icon={<Users size={22} color={COLORS.babyPink} strokeWidth={1.8} />}       label="Groups"   value={String(groupCount)} />
          <StatCard icon={<Receipt size={22} color={COLORS.babyPink} strokeWidth={1.8} />}     label="Expenses" value={String(expenseCount)} />
          <StatCard icon={<CheckCircle size={22} color={COLORS.babyPink} strokeWidth={1.8} />} label="Settled"  value={String(settledCount)} />
        </View>

        {/* Sign Out */}
        <TouchableOpacity style={[styles.signOutBtn, SHADOWS.md]} onPress={handleSignOut}>
          <LinearGradient colors={['#2d0a0a', '#1a0505']} style={styles.signOutGrad}>
            <LogOut size={18} color="#ef4444" strokeWidth={2} />
            <Text style={styles.signOutText}>Sign Out</Text>
          </LinearGradient>
        </TouchableOpacity>

        <View style={{ height: SPACING[10] }} />
      </ScrollView>

      {/* Password Change Modal */}
      <Modal visible={showPwModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <LinearGradient colors={['#2a1040', '#1c0a32']} style={styles.modalGrad}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Change Password</Text>
                <TouchableOpacity onPress={() => { setShowPwModal(false); setCurrentPw(''); setNewPw(''); setConfirmPw(''); }}>
                  <X size={22} color={COLORS.lavender} strokeWidth={2} />
                </TouchableOpacity>
              </View>

              <StyledInput
                label="Current Password"
                value={currentPw}
                onChangeText={setCurrentPw}
                placeholder="Enter current password"
                secureTextEntry
              />
              <StyledInput
                label="New Password"
                value={newPw}
                onChangeText={setNewPw}
                placeholder="Min. 6 characters"
                secureTextEntry
              />
              <StyledInput
                label="Confirm New Password"
                value={confirmPw}
                onChangeText={setConfirmPw}
                placeholder="Repeat new password"
                secureTextEntry
              />

              <TouchableOpacity
                onPress={handleChangePassword}
                disabled={pwLoading}
                style={styles.modalBtn}
              >
                <LinearGradient colors={['#9b59d0', '#ffadd0']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.modalBtnGrad}>
                  <Text style={styles.modalBtnText}>{pwLoading ? 'Changing...' : 'Update Password'}</Text>
                </LinearGradient>
              </TouchableOpacity>
            </LinearGradient>
          </View>
        </View>
      </Modal>
    </LinearGradient>
  );
}

function SettingRow({ icon, label, value, onPress }) {
  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.rowLeft}>
        <View style={styles.rowIcon}>{icon}</View>
        <Text style={styles.rowLabel}>{label}</Text>
      </View>
      <View style={styles.rowRight}>
        {value && <Text style={styles.rowValue}>{value}</Text>}
        <ChevronRight size={16} color={COLORS.lavender} strokeWidth={1.8} />
      </View>
    </TouchableOpacity>
  );
}

function StatCard({ icon, label, value }) {
  return (
    <View style={[styles.statCard, SHADOWS.sm]}>
      <LinearGradient colors={['#2a1040', '#1c0a32']} style={styles.statGrad}>
        {icon}
        <Text style={styles.statValue}>{value}</Text>
        <Text style={styles.statLabel}>{label}</Text>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  root:         { flex: 1 },
  hero:         { alignItems: 'center', padding: SPACING[8], paddingTop: SPACING[12], overflow: 'hidden' },
  heroShimmer:  { position: 'absolute', top: 0, left: 0, right: 0, height: '50%', backgroundColor: 'rgba(255,255,255,0.07)' },
  avatar:       { marginBottom: SPACING[3] },
  heroName:     { color: '#fff', fontSize: FONTS.sizes['2xl'], fontWeight: '800', marginBottom: 4 },
  heroEmail:    { color: 'rgba(255,255,255,0.75)', fontSize: FONTS.sizes.sm, marginBottom: SPACING[4] },
  editBtn:      { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.9)', paddingVertical: SPACING[2], paddingHorizontal: SPACING[4], borderRadius: RADIUS.full },
  editBtnText:  { color: '#7b1fa2', fontSize: FONTS.sizes.sm, fontWeight: '700' },
  editNameRow:  { flexDirection: 'row', alignItems: 'center', gap: SPACING[2], width: '100%', marginBottom: SPACING[2] },
  nameInput:    { color: '#fff' },
  saveBtn:      { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.status.success, alignItems: 'center', justifyContent: 'center' },
  cancelBtn:    { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
  sectionLabel: { color: COLORS.lavender, fontSize: FONTS.sizes.xs, fontWeight: '700', letterSpacing: 1.5, paddingHorizontal: SPACING[5], paddingTop: SPACING[5], paddingBottom: SPACING[2] },
  section:      { marginHorizontal: SPACING[5], backgroundColor: COLORS.background.card, borderRadius: RADIUS.xl, borderWidth: 1, borderColor: 'rgba(255,173,208,0.15)', overflow: 'hidden' },
  row:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: SPACING[4] },
  rowLeft:      { flexDirection: 'row', alignItems: 'center', gap: SPACING[3] },
  rowIcon:      { width: 36, height: 36, borderRadius: RADIUS.md, backgroundColor: 'rgba(255,173,208,0.1)', alignItems: 'center', justifyContent: 'center' },
  rowLabel:     { color: COLORS.white, fontSize: FONTS.sizes.base, fontWeight: '600' },
  rowRight:     { flexDirection: 'row', alignItems: 'center', gap: SPACING[2] },
  rowValue:     { color: COLORS.lavender, fontSize: FONTS.sizes.sm },
  divider:      { height: 1, backgroundColor: 'rgba(255,173,208,0.1)', marginHorizontal: SPACING[4] },
  statsRow:     { flexDirection: 'row', gap: SPACING[3], paddingHorizontal: SPACING[5], marginTop: SPACING[2] },
  statCard:     { flex: 1, borderRadius: RADIUS.xl, overflow: 'hidden' },
  statGrad:     { alignItems: 'center', padding: SPACING[4], gap: SPACING[2], borderWidth: 1, borderColor: 'rgba(255,173,208,0.15)', borderRadius: RADIUS.xl },
  statValue:    { color: COLORS.white, fontSize: FONTS.sizes.xl, fontWeight: '800' },
  statLabel:    { color: COLORS.lavender, fontSize: FONTS.sizes.xs },
  signOutBtn:   { margin: SPACING[5], marginTop: SPACING[6], borderRadius: RADIUS.xl, overflow: 'hidden' },
  signOutGrad:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING[3], padding: SPACING[4], borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)', borderRadius: RADIUS.xl },
  signOutText:  { color: '#ef4444', fontSize: FONTS.sizes.base, fontWeight: '700' },

  // Password Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', padding: SPACING[5] },
  modalCard:    { borderRadius: RADIUS['2xl'], overflow: 'hidden' },
  modalGrad:    { padding: SPACING[6], borderWidth: 1, borderColor: 'rgba(255,173,208,0.15)', borderRadius: RADIUS['2xl'] },
  modalHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING[5] },
  modalTitle:   { color: COLORS.white, fontSize: FONTS.sizes.xl, fontWeight: '800' },
  modalBtn:     { borderRadius: RADIUS.lg, overflow: 'hidden', marginTop: SPACING[3] },
  modalBtnGrad: { paddingVertical: SPACING[3], paddingHorizontal: SPACING[5], alignItems: 'center' },
  modalBtnText: { color: '#fff', fontSize: FONTS.sizes.base, fontWeight: '700' },
});
