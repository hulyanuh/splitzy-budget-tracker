import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, RefreshControl,
  TouchableOpacity, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { supabase, TABLES } from '../../config/supabase';
import { COLORS, FONTS, SPACING, RADIUS } from '../../config/theme';
import { GradientButton, EmptyState, LoadingScreen } from '../../components/UIComponents';
import { GroupCard } from '../../components/Cards';

export default function GroupListScreen({ navigation }) {
  const { user } = useAuth();
  const [groups,     setGroups]     = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(useCallback(() => { fetchGroups(); }, []));

  async function fetchGroups() {
    try {
      const { data, error } = await supabase
        .from(TABLES.GROUP_MEMBERS)
        .select(`
          joined_at,
          group:groups(
            id, name, emoji, description, created_at,
            created_by,
            members:group_members(
              user_id,
              user:users(id, full_name)
            ),
            expenses:expenses(id, amount, paid_by, splits:expense_splits(*))
          )
        `)
        .eq('user_id', user.id)
        .order('joined_at', { ascending: false });

      if (error) throw error;

      const processed = (data || []).map(d => {
        const group    = d.group;
        const expenses = group.expenses || [];
        const members  = group.members  || [];

        // Compute my balance in this group
        let myBalance = 0;
        for (const exp of expenses) {
          if (exp.paid_by === user.id) {
            const othersShare = exp.splits
              ?.filter(s => s.user_id !== user.id)
              .reduce((a, s) => a + s.amount, 0) || 0;
            myBalance += othersShare;
          } else {
            const myShare = exp.splits?.find(s => s.user_id === user.id)?.amount || 0;
            myBalance -= myShare;
          }
        }

        return {
          ...group,
          member_count:  members.length,
          expense_count: expenses.length,
          myBalance,
        };
      });

      setGroups(processed);
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  if (loading) return <LoadingScreen message="Loading groups..." />;

  return (
    <LinearGradient colors={['#321555', '#271040']} style={styles.root}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>My Groups</Text>
          <Text style={styles.sub}>{groups.length} active group{groups.length !== 1 ? 's' : ''}</Text>
        </View>
        <GradientButton
          title="New"
          icon="+"
          onPress={() => navigation.navigate('CreateGroup')}
          style={{ paddingHorizontal: 0 }}
          textStyle={{ fontSize: FONTS.sizes.sm }}
        />
      </View>

      <FlatList
        data={groups}
        keyExtractor={g => g.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); fetchGroups(); }}
            tintColor={COLORS.purple[400]}
          />
        }
        ListEmptyComponent={
          <EmptyState
            icon="👥"
            title="No groups yet"
            message="Create a group to start splitting expenses with friends, family, or roommates."
            action={() => navigation.navigate('CreateGroup')}
            actionLabel="Create First Group"
          />
        }
        renderItem={({ item }) => (
          <GroupCard
            group={item}
            myBalance={item.myBalance}
            onPress={() => navigation.navigate('GroupDetail', {
              groupId:   item.id,
              groupName: item.name,
            })}
          />
        )}
      />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root:   { flex: 1 },
  header: {
    flexDirection:  'row',
    justifyContent: 'space-between',
    alignItems:     'center',
    padding:        SPACING[6],
    paddingTop:     SPACING[12],
  },
  title:  { color: COLORS.white, fontSize: FONTS.sizes['2xl'], fontWeight: '800' },
  sub:    { color: COLORS.text.muted, fontSize: FONTS.sizes.sm, marginTop: 2 },
  list:   { paddingHorizontal: SPACING[5], paddingBottom: SPACING[8] },
});
