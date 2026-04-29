import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, KeyboardAvoidingView,
  Platform, TouchableOpacity, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../context/AuthContext';
import { GradientButton, StyledInput } from '../../components/UIComponents';
import { COLORS, FONTS, SPACING, RADIUS } from '../../config/theme';

export default function SignupScreen({ navigation }) {
  const { signUp } = useAuth();

  const [fullName, setFullName] = useState('');
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [confirm,  setConfirm]  = useState('');
  const [loading,  setLoading]  = useState(false);
  const [errors,   setErrors]   = useState({});

  function validate() {
    const e = {};
    if (!fullName.trim())       e.fullName = 'Full name is required';
    if (!email.includes('@'))   e.email    = 'Enter a valid email';
    if (password.length < 6)    e.password = 'Password must be 6+ characters';
    if (password !== confirm)   e.confirm  = 'Passwords do not match';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSignup() {
    if (!validate()) return;
    setLoading(true);
    try {
      await signUp({ email: email.trim(), password, fullName: fullName.trim() });
      Alert.alert('🎉 Account Created!', 'Welcome to Splitzy! Check your email to verify your account.', [
        { text: 'OK', onPress: () => navigation.navigate('Login') },
      ]);
    } catch (err) {
      Alert.alert('Signup Failed', err.message || 'Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <LinearGradient colors={COLORS.gradients.dark} style={styles.root}>
      <View style={styles.blob} />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Back button */}
          <TouchableOpacity style={styles.back} onPress={() => navigation.goBack()}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Create account</Text>
            <Text style={styles.sub}>Join Splitzy and start splitting fair</Text>
          </View>

          {/* Form */}
          <View style={styles.card}>
            <StyledInput
              label="Full Name"
              placeholder="Your full name"
              value={fullName}
              onChangeText={setFullName}
              autoCapitalize="words"
              error={errors.fullName}
            />
            <StyledInput
              label="Email"
              placeholder="you@example.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
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
            <StyledInput
              label="Confirm Password"
              placeholder="••••••••"
              value={confirm}
              onChangeText={setConfirm}
              secureTextEntry
              error={errors.confirm}
            />

            <GradientButton
              title="Create Account"
              onPress={handleSignup}
              loading={loading}
              icon="✨"
              style={{ marginTop: SPACING[2] }}
            />
          </View>

          {/* Terms */}
          <Text style={styles.terms}>
            By creating an account, you agree to our{' '}
            <Text style={{ color: COLORS.purple[300] }}>Terms of Service</Text>
            {' '}and{' '}
            <Text style={{ color: COLORS.purple[300] }}>Privacy Policy</Text>
          </Text>

          {/* Login link */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={styles.footerLink}>Sign in</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root:   { flex: 1 },
  blob:   {
    position: 'absolute', width: 300, height: 300,
    borderRadius: 150, backgroundColor: COLORS.pink[600] + '22',
    top: -60, left: -60,
  },
  scroll: { flexGrow: 1, padding: SPACING[6], paddingTop: SPACING[12] },
  back:   { marginBottom: SPACING[6] },
  backText: { color: COLORS.purple[300], fontSize: FONTS.sizes.base, fontWeight: '600' },
  header:   { marginBottom: SPACING[6] },
  title:    { color: COLORS.white, fontSize: FONTS.sizes['3xl'], fontWeight: '900', letterSpacing: -1 },
  sub:      { color: COLORS.text.muted, fontSize: FONTS.sizes.base, marginTop: SPACING[1] },
  card: {
    backgroundColor: COLORS.background.card,
    borderRadius:    RADIUS['2xl'],
    borderWidth:     1,
    borderColor:     COLORS.borderLight,
    padding:         SPACING[6],
    marginBottom:    SPACING[5],
  },
  terms:    { color: COLORS.text.muted, fontSize: FONTS.sizes.xs, textAlign: 'center', lineHeight: 18, marginBottom: SPACING[5] },
  footer:   { flexDirection: 'row', justifyContent: 'center' },
  footerText: { color: COLORS.text.muted, fontSize: FONTS.sizes.base },
  footerLink: { color: COLORS.pink[400], fontSize: FONTS.sizes.base, fontWeight: '700' },
});
