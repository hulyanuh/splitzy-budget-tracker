import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, KeyboardAvoidingView,
  Platform, TouchableOpacity, Alert, Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../context/AuthContext';
import { GradientButton, StyledInput } from '../../components/UIComponents';
import { COLORS, FONTS, SPACING, RADIUS } from '../../config/theme';

const { width, height } = Dimensions.get('window');

export default function LoginScreen({ navigation }) {
  const { signIn } = useAuth();

  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [loading,  setLoading]  = useState(false);
  const [errors,   setErrors]   = useState({});

  function validate() {
    const e = {};
    if (!email.trim())    e.email    = 'Email is required';
    if (!email.includes('@')) e.email = 'Enter a valid email';
    if (!password)        e.password = 'Password is required';
    if (password.length < 6) e.password = 'Password must be 6+ characters';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleLogin() {
    if (!validate()) return;
    setLoading(true);
    try {
      await signIn({ email: email.trim(), password });
    } catch (err) {
      Alert.alert('Login Failed', err.message || 'Check your credentials and try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <LinearGradient colors={COLORS.gradients.dark} style={styles.root}>
      {/* Decorative blobs */}
      <View style={styles.blob1} />
      <View style={styles.blob2} />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.kav}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Logo / Header */}
          <View style={styles.header}>
            <LinearGradient
              colors={COLORS.gradients.primary}
              style={styles.logoRing}
            >
              <Text style={styles.logoEmoji}>💸</Text>
            </LinearGradient>
            <Text style={styles.appName}>Splitzy</Text>
            <Text style={styles.tagline}>Split smart. Pay easy.</Text>
          </View>

          {/* Card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Welcome back</Text>
            <Text style={styles.cardSub}>Sign in to continue</Text>

            <StyledInput
              label="Email"
              placeholder="you@example.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              error={errors.email}
            />

            <StyledInput
              label="Password"
              placeholder="••••••••"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              error={errors.password}
            />

            <GradientButton
              title="Sign In"
              onPress={handleLogin}
              loading={loading}
              icon="🔐"
              style={{ marginTop: SPACING[2] }}
            />

            <TouchableOpacity style={styles.forgotBtn}>
              <Text style={styles.forgotText}>Forgot password?</Text>
            </TouchableOpacity>
          </View>

          {/* Sign up link */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Signup')}>
              <Text style={styles.footerLink}>Create account</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  blob1: {
    position: 'absolute', width: 300, height: 300,
    borderRadius: 150, backgroundColor: COLORS.purple[900],
    top: -80, right: -80, opacity: 0.7,
  },
  blob2: {
    position: 'absolute', width: 250, height: 250,
    borderRadius: 125, backgroundColor: COLORS.blue[700] + '44',
    bottom: 100, left: -60,
  },
  kav:    { flex: 1 },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: SPACING[6] },
  header: { alignItems: 'center', marginBottom: SPACING[8] },
  logoRing: {
    width: 96, height: 96, borderRadius: 48,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: SPACING[4],
  },
  logoEmoji: { fontSize: 48 },
  appName:   { color: COLORS.white, fontSize: FONTS.sizes['4xl'], fontWeight: '900', letterSpacing: -1 },
  tagline:   { color: COLORS.text.muted, fontSize: FONTS.sizes.base, marginTop: SPACING[1] },
  card: {
    backgroundColor: COLORS.background.card,
    borderRadius: RADIUS['2xl'],
    borderWidth:  1,
    borderColor:  COLORS.borderLight,
    padding:      SPACING[6],
    marginBottom: SPACING[6],
  },
  cardTitle: { color: COLORS.white, fontSize: FONTS.sizes['2xl'], fontWeight: '800', marginBottom: SPACING[1] },
  cardSub:   { color: COLORS.text.muted, fontSize: FONTS.sizes.base, marginBottom: SPACING[6] },
  forgotBtn: { alignItems: 'center', marginTop: SPACING[4] },
  forgotText:{ color: COLORS.purple[300], fontSize: FONTS.sizes.sm },
  footer:     { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  footerText: { color: COLORS.text.muted, fontSize: FONTS.sizes.base },
  footerLink: { color: COLORS.pink[400], fontSize: FONTS.sizes.base, fontWeight: '700' },
});
