import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, KeyboardAvoidingView,
  Platform, TouchableOpacity, Alert, TextInput,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../context/AuthContext';
import { supabase, TABLES } from '../../config/supabase';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../../config/theme';
import { GradientButton, OutlineButton, StyledInput, Avatar, GlassCard } from '../../components/UIComponents';

const EMOJIS = ['👥', '✈️', '🏖️', '🍕', '🏠', '🎉', '💼', '🎮', '🏋️', '🎓', '🌍', '🚗'];

export default function CreateEditGroupScreen({ route, navigation }) {
  const { group, groupId, members: existingMembers } = route.params || {};
  const isEditing = !!groupId;
  const { user, profile } = useAuth();

  const [name,        setName]        = useState(group?.name        || '');
  const [description, setDescription] = useState(group?.description || '');
  const [emoji,       setEmoji]       = useState(group?.emoji       || '👥');
  const [memberEmail, setMemberEmail] = useState('');
  const [members,     setMembers]     = useState([]);
  const [loading,     setLoading]     = useState(false);
  const [errors,      setErrors]      = useState({});

  // Pre-populate current user + existing members
  useEffect(() => {
    const currentUser = { user_id: user.id, full_name: profile?.full_name || 'You', email: profile?.email || '', isCurrentUser: true };
    if (isEditing && existingMembers) {
      setMembers(existingMembers.map(m => ({
        user_id:  m.user_id,
        full_name: m.user?.full_name || '',
        email:    m.user?.email      || '',
        isCurrentUser: m.user_id === user.id,
      })));
    } else {
      setMembers([currentUser]);
    }
  }, []);

  async function addMember() {
    if (!memberEmail.trim()) return;
    if (!memberEmail.includes('@')) {
      Alert.alert('Invalid Email', 'Please enter a valid email address.');
      return;
    }
    if (members.find(m => m.email === memberEmail.trim())) {
      Alert.alert('Already Added', 'This member is already in the group.');
      return;
    }

    try {
      const { data, error } = await supabase
        .from(TABLES.USERS)
        .select('id, full_name, email')
        .eq('email', memberEmail.trim())
        .single();

      if (error || !data) {
        Alert.alert('User Not Found', 'No Splitzy account found for this email. They need to sign up first.');
        return;
      }

      setMembers(prev => [...prev, {
        user_id:  data.id,
        full_name: data.full_name,
        email:    data.email,
      }]);
      setMemberEmail('');
    } catch (err) {
      Alert.alert('Error', err.message);
    }
  }

  function removeMember(userId) {
    if (userId === user.id) return; // Can't remove yourself
    setMembers(prev => prev.filter(m => m.user_id !== userId));
  }

  function validate() {
    const e = {};
    if (!name.trim())      e.name    = 'Group name is required';
    if (members.length < 2) e.members = 'Add at least one other member';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function saveGroup() {
    if (!validate()) return;
    setLoading(true);
    try {
      let targetGroupId = groupId;

      if (!isEditing) {
        // Create group
        const { data: newGroup, error: gErr } = await supabase
          .from(TABLES.GROUPS)
          .insert({ name: name.trim(), description: description.trim(), emoji, created_by: user.id })
          .select()
          .single();
        if (gErr) throw gErr;
        targetGroupId = newGroup.id;

        // Add members
        const memberRows = members.map(m => ({
          group_id: targetGroupId,
          user_id:  m.user_id,
          role:     m.user_id === user.id ? 'admin' : 'member',
        }));
        const { error: mErr } = await supabase.from(TABLES.GROUP_MEMBERS).insert(memberRows);
        if (mErr) throw mErr;

        Alert.alert('🎉 Group Created!', `"${name}" is ready. Start adding expenses!`, [
          { text: 'Open Group', onPress: () => navigation.replace('GroupDetail', { groupId: targetGroupId, groupName: name.trim() }) },
        ]);
      } else {
        // Update group info
        const { error: uErr } = await supabase
          .from(TABLES.GROUPS)
          .update({ name: name.trim(), description: description.trim(), emoji })
          .eq('id', groupId);
        if (uErr) throw uErr;

        // Sync members: add new, remove deleted
        const { data: currMems } = await supabase
          .from(TABLES.GROUP_MEMBERS)
          .select('user_id')
          .eq('group_id', groupId);

        const currIds = (currMems || []).map(m => m.user_id);
        const newIds  = members.map(m => m.user_id);

        const toAdd    = members.filter(m => !currIds.includes(m.user_id));
        const toRemove = currIds.filter(id => !newIds.includes(id) && id !== user.id);

        if (toAdd.length) {
          await supabase.from(TABLES.GROUP_MEMBERS).insert(toAdd.map(m => ({
            group_id: groupId,
            user_id:  m.user_id,
            role:     'member',
          })));
        }
        if (toRemove.length) {
          await supabase.from(TABLES.GROUP_MEMBERS).delete()
            .eq('group_id', groupId)
            .in('user_id', toRemove);
        }

        Alert.alert('✅ Group Updated', 'Changes saved successfully.');
        navigation.goBack();
      }
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <LinearGradient colors={COLORS.gradients.dark} style={{ flex: 1 }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Text style={styles.backText}>← Back</Text>
            </TouchableOpacity>
            <Text style={styles.title}>{isEditing ? 'Edit Group' : 'New Group'}</Text>
          </View>

          {/* Emoji Picker */}
          <GlassCard style={styles.emojiCard}>
            <Text style={styles.sectionLabel}>Pick an Emoji</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {EMOJIS.map(e => (
                <TouchableOpacity
                  key={e}
                  onPress={() => setEmoji(e)}
                  style={[styles.emojiBubble, emoji === e && styles.emojiBubbleSelected]}
                >
                  <Text style={styles.emojiText}>{e}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </GlassCard>

          {/* Group Details */}
          <GlassCard style={styles.formCard}>
            <StyledInput
              label="Group Name *"
              placeholder="Trip to Palawan, Dinner Club..."
              value={name}
              onChangeText={setName}
              error={errors.name}
            />
            <StyledInput
              label="Description (optional)"
              placeholder="What's this group for?"
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={3}
              inputStyle={{ textAlignVertical: 'top', height: 80 }}
            />
          </GlassCard>

          {/* Members */}
          <GlassCard style={styles.formCard}>
            <Text style={styles.sectionLabel}>Members ({members.length})</Text>
            {errors.members && <Text style={styles.errorText}>{errors.members}</Text>}

            {/* Member list */}
            {members.map(m => (
              <View key={m.user_id} style={styles.memberRow}>
                <Avatar name={m.full_name} size={40} />
                <View style={styles.memberInfo}>
                  <Text style={styles.memberName}>{m.full_name} {m.isCurrentUser ? '(You)' : ''}</Text>
                  <Text style={styles.memberEmail}>{m.email}</Text>
                </View>
                {!m.isCurrentUser && (
                  <TouchableOpacity onPress={() => removeMember(m.user_id)} style={styles.removeBtn}>
                    <Text style={styles.removeText}>✕</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))}

            {/* Add member */}
            <View style={styles.addMemberRow}>
              <TextInput
                style={styles.emailInput}
                placeholder="Add by email..."
                placeholderTextColor={COLORS.text.placeholder}
                value={memberEmail}
                onChangeText={setMemberEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                selectionColor={COLORS.purple[400]}
                returnKeyType="done"
                onSubmitEditing={addMember}
              />
              <TouchableOpacity style={styles.addBtn} onPress={addMember}>
                <LinearGradient colors={COLORS.gradients.primary} style={styles.addBtnGrad}>
                  <Text style={styles.addBtnText}>Add</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </GlassCard>

          {/* Save */}
          <GradientButton
            title={isEditing ? 'Save Changes' : 'Create Group'}
            onPress={saveGroup}
            loading={loading}
            icon={isEditing ? '✅' : '🚀'}
          />

          <View style={{ height: SPACING[8] }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  scroll:    { padding: SPACING[5], paddingTop: SPACING[12] },
  header:    { marginBottom: SPACING[6] },
  backText:  { color: COLORS.purple[300], fontSize: FONTS.sizes.base, fontWeight: '600', marginBottom: SPACING[4] },
  title:     { color: COLORS.white, fontSize: FONTS.sizes['2xl'], fontWeight: '900' },
  sectionLabel: {
    color: COLORS.text.secondary, fontSize: FONTS.sizes.sm, fontWeight: '700',
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: SPACING[3],
  },
  emojiCard: { marginBottom: SPACING[4] },
  formCard:  { marginBottom: SPACING[4] },
  emojiBubble: {
    width: 52, height: 52, borderRadius: 26,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: COLORS.background.elevated,
    marginRight: SPACING[2], borderWidth: 2, borderColor: 'transparent',
  },
  emojiBubbleSelected: { borderColor: COLORS.purple[400], backgroundColor: COLORS.purple[900] },
  emojiText: { fontSize: 26 },
  memberRow: { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING[3] },
  memberInfo:{ flex: 1, marginLeft: SPACING[3] },
  memberName:{ color: COLORS.text.primary, fontSize: FONTS.sizes.base, fontWeight: '600' },
  memberEmail: { color: COLORS.text.muted, fontSize: FONTS.sizes.xs },
  removeBtn: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: COLORS.status.errorBg,
    alignItems: 'center', justifyContent: 'center',
  },
  removeText: { color: COLORS.status.error, fontSize: 14, fontWeight: '700' },
  addMemberRow: { flexDirection: 'row', gap: SPACING[2], marginTop: SPACING[3] },
  emailInput: {
    flex: 1,
    backgroundColor: COLORS.background.input,
    borderWidth: 1.5, borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING[4], paddingVertical: SPACING[3],
    color: COLORS.text.primary, fontSize: FONTS.sizes.base,
  },
  addBtn:    { borderRadius: RADIUS.md, overflow: 'hidden' },
  addBtnGrad:{ paddingHorizontal: SPACING[4], paddingVertical: SPACING[3] + 2, alignItems: 'center' },
  addBtnText:{ color: '#fff', fontWeight: '700', fontSize: FONTS.sizes.base },
  errorText: { color: COLORS.status.error, fontSize: FONTS.sizes.sm, marginBottom: SPACING[3] },
});
