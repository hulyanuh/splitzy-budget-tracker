import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Mail, Lock, LogIn, SplitSquareHorizontal } from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../../config/theme';
import { StyledInput, GradientButton } from '../../components/UIComponents';

export default function LoginScreen({ navigation }) {
  const { signIn } = useAuth();
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [loading,  setLoading]  = useState(false);
  const [errors,   setErrors]   = useState({});

  function validate() {
    const e = {};
    if (!email.trim())    e.email    = 'Email is required';
    if (!password)        e.password = 'Password is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleLogin() {
    if (!validate()) return;
    setLoading(true);
    try {
      await signIn({ email: email.trim(), password });
    } catch (err) {
      Alert.alert('Login Failed', err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <LinearGradient colors={['#1e0a30', '#130520']} style={styles.root}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

          {/* Logo */}
          <View style={styles.logoWrap}>
            <LinearGradient colors={['#9b59d0', '#ffadd0']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.logoCircle}>
              <SplitSquareHorizontal size={40} color="#fff" strokeWidth={1.8} />
            </LinearGradient>
            <Text style={styles.logoText}>Splitzy</Text>
            <Text style={styles.logoSub}>Split smart. Pay easy.</Text>
          </View>

          {/* Card */}
          <View style={[styles.card, SHADOWS.lg]}>
            <LinearGradient colors={['#2a1040', '#1c0a32']} style={styles.cardGrad}>
              <Text style={styles.cardTitle}>Welcome back</Text>
              <Text style={styles.cardSub}>Sign in to your account</Text>

              <StyledInput
                label="Email"
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                keyboardType="email-address"
                autoCapitalize="none"
                error={errors.email}
              />
              <StyledInput
                label="Password"
                value={password}
                onChangeText={setPassword}
                placeholder="Your password"
                secureTextEntry
                error={errors.password}
              />

              <GradientButton
                title="Sign In"
                onPress={handleLogin}
                loading={loading}
                icon={<LogIn size={18} color="#fff" strokeWidth={2} />}
                style={{ marginTop: SPACING[2] }}
              />

              <TouchableOpacity style={styles.switchRow} onPress={() => navigation.navigate('Signup')}>
                <Text style={styles.switchText}>Don't have an account? </Text>
                <Text style={styles.switchLink}>Sign up</Text>
              </TouchableOpacity>
            </LinearGradient>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root:       { flex: 1 },
  scroll:     { flexGrow: 1, justifyContent: 'center', padding: SPACING[6] },
  logoWrap:   { alignItems: 'center', marginBottom: SPACING[8] },
  logoCircle: { width: 88, height: 88, borderRadius: 44, alignItems: 'center', justifyContent: 'center', marginBottom: SPACING[4] },
  logoText:   { color: COLORS.white, fontSize: FONTS.sizes['3xl'], fontWeight: '900', letterSpacing: -1 },
  logoSub:    { color: COLORS.lavender, fontSize: FONTS.sizes.base, marginTop: 4 },
  card:       { borderRadius: RADIUS['2xl'], overflow: 'hidden' },
  cardGrad:   { padding: SPACING[6], borderWidth: 1, borderColor: 'rgba(255,173,208,0.15)', borderRadius: RADIUS['2xl'] },
  cardTitle:  { color: COLORS.white,    fontSize: FONTS.sizes['2xl'], fontWeight: '800', marginBottom: 4 },
  cardSub:    { color: COLORS.lavender, fontSize: FONTS.sizes.base, marginBottom: SPACING[6] },
  switchRow:  { flexDirection: 'row', justifyContent: 'center', marginTop: SPACING[5] },
  switchText: { color: COLORS.lavender, fontSize: FONTS.sizes.sm },
  switchLink: { color: COLORS.babyPink, fontSize: FONTS.sizes.sm, fontWeight: '700' },
});
