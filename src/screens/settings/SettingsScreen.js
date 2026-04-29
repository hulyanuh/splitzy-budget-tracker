import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, Switch,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../context/AuthContext';
import { COLORS, FONTS, SPACING, RADIUS } from '../../config/theme';
import { GradientButton, OutlineButton, StyledInput, Avatar, GlassCard } from '../../components/UIComponents';

export default function SettingsScreen({ navigation }) {
  const { user, profile, updateProfile, signOut } = useAuth();

  const [fullName,  setFullName]  = useState(profile?.full_name || '');
  const [editing,   setEditing]   = useState(false);
  const [loading,   setLoading]   = useState(false);
  const [notifs,    setNotifs]    = useState(true);

  async function handleUpdate() {
    if (!fullName.trim()) { Alert.alert('Error', 'Name cannot be empty'); return; }
    setLoading(true);
    try {
      await updateProfile({ full_name: fullName.trim() });
      setEditing(false);
      Alert.alert('✅ Updated', 'Profile updated successfully!');
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSignOut() {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          try { await signOut(); } catch (err) { Alert.alert('Error', err.message); }
        },
      },
    ]);
  }

  const SettingRow = ({ icon, label, value, onPress, rightElement, danger }) => (
    <TouchableOpacity
      style={styles.settingRow}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
      disabled={!onPress && !rightElement}
    >
      <Text style={styles.settingIcon}>{icon}</Text>
      <View style={styles.settingInfo}>
        <Text style={[styles.settingLabel, danger && { color: COLORS.status.error }]}>{label}</Text>
        {value && <Text style={styles.settingValue}>{value}</Text>}
      </View>
      {rightElement || (onPress && <Text style={styles.chevron}>›</Text>)}
    </TouchableOpacity>
  );

  return (
    <LinearGradient colors={COLORS.gradients.dark} style={styles.root}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* ── Header ── */}
        <View style={styles.header}>
          <Text style={styles.title}>Profile & Settings</Text>
        </View>

        {/* ── Profile Hero ── */}
        <LinearGradient
          colors={COLORS.gradients.primary}
          style={styles.profileHero}
        >
          <Avatar name={profile?.full_name || user?.email || ''} size={80} />
          <Text style={styles.profileName}>{profile?.full_name || 'User'}</Text>
          <Text style={styles.profileEmail}>{user?.email}</Text>
          <TouchableOpacity style={styles.editBadge} onPress={() => setEditing(!editing)}>
            <Text style={styles.editBadgeText}>{editing ? 'Cancel' : '✏️ Edit Profile'}</Text>
          </TouchableOpacity>
        </LinearGradient>

        {/* ── Edit form ── */}
        {editing && (
          <GlassCard style={styles.editCard}>
            <StyledInput
              label="Full Name"
              value={fullName}
              onChangeText={setFullName}
              autoCapitalize="words"
            />
            <GradientButton
              title="Save Changes"
              onPress={handleUpdate}
              loading={loading}
              style={{ marginTop: SPACING[2] }}
            />
          </GlassCard>
        )}

        {/* ── Account ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          <GlassCard style={styles.settingsCard}>
            <SettingRow icon="📧" label="Email"         value={user?.email} />
            <View style={styles.divider} />
            <SettingRow icon="🔒" label="Change Password" onPress={() => Alert.alert('Info', 'Password reset email will be sent to your inbox.')} />
          </GlassCard>
        </View>

        {/* ── Preferences ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Preferences</Text>
          <GlassCard style={styles.settingsCard}>
            <SettingRow
              icon="🔔"
              label="Notifications"
              rightElement={
                <Switch
                  value={notifs}
                  onValueChange={setNotifs}
                  trackColor={{ false: COLORS.background.elevated, true: COLORS.purple[500] }}
                  thumbColor={notifs ? COLORS.white : COLORS.text.muted}
                />
              }
            />
            <View style={styles.divider} />
            <SettingRow icon="💱" label="Currency" value="Philippine Peso (₱)" onPress={() => Alert.alert('Coming Soon', 'Currency selection coming soon!')} />
          </GlassCard>
        </View>

        {/* ── Stats ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Stats</Text>
          <View style={styles.statsRow}>
            {[
              { icon: '👥', label: 'Groups',   value: '—' },
              { icon: '💸', label: 'Expenses',  value: '—' },
              { icon: '✅', label: 'Settled',   value: '—' },
            ].map(s => (
              <GlassCard key={s.label} style={styles.statCard}>
                <Text style={styles.statIcon}>{s.icon}</Text>
                <Text style={styles.statValue}>{s.value}</Text>
                <Text style={styles.statLabel}>{s.label}</Text>
              </GlassCard>
            ))}
          </View>
        </View>

        {/* ── About ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          <GlassCard style={styles.settingsCard}>
            <SettingRow icon="ℹ️" label="Version"         value="1.0.0" />
            <View style={styles.divider} />
            <SettingRow icon="📄" label="Terms of Service" onPress={() => {}} />
            <View style={styles.divider} />
            <SettingRow icon="🔏" label="Privacy Policy"   onPress={() => {}} />
          </GlassCard>
        </View>

        {/* ── Sign Out ── */}
        <View style={[styles.section, { marginBottom: SPACING[8] }]}>
          <OutlineButton
            title="Sign Out"
            icon="🚪"
            variant="danger"
            onPress={handleSignOut}
          />
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root:        { flex: 1 },
  header:      { padding: SPACING[6], paddingTop: SPACING[12] },
  title:       { color: COLORS.white, fontSize: FONTS.sizes['2xl'], fontWeight: '900' },
  profileHero: { margin: SPACING[5], borderRadius: RADIUS['2xl'], padding: SPACING[6], alignItems: 'center' },
  profileName: { color: COLORS.white, fontSize: FONTS.sizes.xl, fontWeight: '800', marginTop: SPACING[3] },
  profileEmail:{ color: 'rgba(255,255,255,0.7)', fontSize: FONTS.sizes.sm, marginTop: SPACING[1] },
  editBadge:   {
    marginTop:         SPACING[4],
    paddingHorizontal: SPACING[4],
    paddingVertical:   SPACING[2],
    backgroundColor:   'rgba(255,255,255,0.15)',
    borderRadius:      RADIUS.full,
  },
  editBadgeText: { color: COLORS.white, fontSize: FONTS.sizes.sm, fontWeight: '700' },
  editCard:    { margin: SPACING[5], marginTop: 0 },
  section:     { paddingHorizontal: SPACING[5], marginBottom: SPACING[5] },
  sectionTitle:{ color: COLORS.text.muted, fontSize: FONTS.sizes.xs, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginBottom: SPACING[3] },
  settingsCard:{ padding: 0, overflow: 'hidden' },
  settingRow:  { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING[4], paddingVertical: SPACING[4] },
  settingIcon: { fontSize: 22, width: 36 },
  settingInfo: { flex: 1 },
  settingLabel:{ color: COLORS.text.primary, fontSize: FONTS.sizes.base, fontWeight: '600' },
  settingValue:{ color: COLORS.text.muted,   fontSize: FONTS.sizes.sm,   marginTop: 2 },
  chevron:     { color: COLORS.text.muted, fontSize: 22 },
  divider:     { height: 1, backgroundColor: COLORS.borderLight, marginHorizontal: SPACING[4] },
  statsRow:    { flexDirection: 'row', gap: SPACING[3] },
  statCard:    { flex: 1, alignItems: 'center', padding: SPACING[4] },
  statIcon:    { fontSize: 24 },
  statValue:   { color: COLORS.white, fontSize: FONTS.sizes.xl, fontWeight: '800', marginTop: SPACING[2] },
  statLabel:   { color: COLORS.text.muted, fontSize: FONTS.sizes.xs, marginTop: 2 },
});
