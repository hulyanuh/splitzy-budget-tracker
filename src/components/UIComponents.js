import React, { useRef, createContext, useContext, useState } from 'react';
import {
  View, Text, TouchableOpacity, ActivityIndicator,
  StyleSheet, Animated, TextInput,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../config/theme';

// ─────────────────────────────────────────────────────────────────────────────
// 🔘 GRADIENT BUTTON
// ─────────────────────────────────────────────────────────────────────────────
export function GradientButton({ title, onPress, loading, disabled, variant = 'primary', style, textStyle, icon }) {
  const scale = useRef(new Animated.Value(1)).current;

  const gradients = {
    primary:   COLORS.gradients.primary,
    secondary: COLORS.gradients.secondary,
    accent:    COLORS.gradients.accent,
    soft:      COLORS.gradients.soft,
    danger:    COLORS.gradients.danger,
    success:   COLORS.gradients.success,
  };

  const textColors = {
    primary:   '#ffffff',
    secondary: '#2d0a40',
    accent:    '#2d0a40',
    soft:      '#7b1fa2',
    danger:    '#ffffff',
    success:   '#ffffff',
  };

  const handlePressIn  = () => Animated.spring(scale, { toValue: 0.96, useNativeDriver: true }).start();
  const handlePressOut = () => Animated.spring(scale, { toValue: 1,    useNativeDriver: true }).start();

  return (
    <Animated.View style={[{ transform: [{ scale }] }, style]}>
      <TouchableOpacity
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled || loading}
        activeOpacity={1}
      >
        <LinearGradient
          colors={disabled ? ['#3d2060', '#3d2060'] : (gradients[variant] || gradients.primary)}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.gradBtn, SHADOWS.md]}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <View style={styles.gradBtnInner}>
              {icon && <Text style={styles.gradBtnIcon}>{icon}</Text>}
              <Text style={[styles.gradBtnText, { color: textColors[variant] || '#fff' }, textStyle]}>{title}</Text>
            </View>
          )}
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 🔲 OUTLINE BUTTON
// ─────────────────────────────────────────────────────────────────────────────
export function OutlineButton({ title, onPress, disabled, variant = 'default', style, icon }) {
  const borderColors = {
    default: COLORS.babyPink,
    pink:    COLORS.pink[400],
    danger:  COLORS.status.error,
    success: COLORS.status.success,
    white:   'rgba(255,255,255,0.6)',
  };

  const textColors = {
    default: COLORS.blush,
    pink:    COLORS.pink[300],
    danger:  COLORS.status.error,
    success: COLORS.status.success,
    white:   '#ffffff',
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      style={[styles.outlineBtn, { borderColor: borderColors[variant] || borderColors.default }, style]}
      activeOpacity={0.7}
    >
      {icon && <Text style={{ marginRight: 6 }}>{icon}</Text>}
      <Text style={[styles.outlineBtnText, { color: textColors[variant] || textColors.default }]}>{title}</Text>
    </TouchableOpacity>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ✅ ACCEPT BUTTON
// ─────────────────────────────────────────────────────────────────────────────
export function AcceptButton({ title = 'Accept', onPress, style }) {
  return (
    <TouchableOpacity onPress={onPress} style={[styles.acceptBtn, style]} activeOpacity={0.8}>
      <LinearGradient
        colors={['#16a34a', '#15803d']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.acceptGrad}
      >
        <Text style={styles.acceptText}>✓ {title}</Text>
      </LinearGradient>
    </TouchableOpacity>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ❌ DECLINE BUTTON
// ─────────────────────────────────────────────────────────────────────────────
export function DeclineButton({ title = 'Decline', onPress, style }) {
  return (
    <TouchableOpacity onPress={onPress} style={[styles.declineBtn, style]} activeOpacity={0.8}>
      <LinearGradient
        colors={['#dc2626', '#991b1b']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.acceptGrad}
      >
        <Text style={styles.acceptText}>✕ {title}</Text>
      </LinearGradient>
    </TouchableOpacity>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 📝 STYLED INPUT
// ─────────────────────────────────────────────────────────────────────────────
export function StyledInput({ label, error, containerStyle, inputStyle, ...props }) {
  return (
    <View style={[styles.inputContainer, containerStyle]}>
      {label && <Text style={styles.inputLabel}>{label}</Text>}
      <TextInput
        style={[styles.input, error && styles.inputError, inputStyle]}
        placeholderTextColor={COLORS.text.placeholder}
        selectionColor={COLORS.babyPink}
        {...props}
      />
      {error && <Text style={styles.inputErrorText}>{error}</Text>}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 🃏 GLASS CARD
// ─────────────────────────────────────────────────────────────────────────────
export function GlassCard({ children, style, onPress }) {
  const Wrapper = onPress ? TouchableOpacity : View;
  return (
    <Wrapper onPress={onPress} activeOpacity={0.8} style={[styles.card, SHADOWS.sm, style]}>
      {children}
    </Wrapper>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 🏷️ BADGE
// ─────────────────────────────────────────────────────────────────────────────
export function Badge({ label, color = COLORS.babyPink, textColor, style }) {
  const tc = textColor || (color === COLORS.babyPink ? '#7b1fa2' : '#fff');
  return (
    <View style={[styles.badge, { backgroundColor: color + '33' }, style]}>
      <Text style={[styles.badgeText, { color: tc }]}>{label}</Text>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 🌀 LOADING SCREEN
// ─────────────────────────────────────────────────────────────────────────────
export function LoadingScreen({ message = 'Loading...' }) {
  return (
    <LinearGradient colors={COLORS.gradients.dark} style={styles.loadingScreen}>
      <ActivityIndicator size="large" color={COLORS.babyPink} />
      <Text style={styles.loadingText}>{message}</Text>
    </LinearGradient>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 📭 EMPTY STATE
// ─────────────────────────────────────────────────────────────────────────────
export function EmptyState({ icon = '📭', title, message, action, actionLabel }) {
  return (
    <View style={styles.emptyState}>
      <Text style={styles.emptyIcon}>{icon}</Text>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyMessage}>{message}</Text>
      {action && (
        <GradientButton title={actionLabel} onPress={action} variant="secondary" style={{ marginTop: SPACING[4] }} />
      )}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 📊 SECTION HEADER
// ─────────────────────────────────────────────────────────────────────────────
export function SectionHeader({ title, action, actionLabel }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {action && (
        <TouchableOpacity onPress={action}>
          <Text style={styles.sectionAction}>{actionLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 🎨 AVATAR
// ─────────────────────────────────────────────────────────────────────────────
export function Avatar({ name = '', size = 40, style }) {
  const initials = name
    .split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const colors = [
    ['#ffadd0', '#c084fc'],   // baby pink → lavender
    ['#ffc2d9', '#9b59d0'],   // blush → purple
    ['#f0abff', '#60a5fa'],   // lavender → blue
    ['#ffadd0', '#f472b6'],   // baby pink → hot pink
    ['#e9d5ff', '#ffadd0'],   // soft purple → baby pink
  ];
  const textColors = ['#7b1fa2', '#5b1a8a', '#1d4ed8', '#9d174d', '#6b21a8'];

  const idx = name.length > 0 ? name.charCodeAt(0) % colors.length : 0;

  return (
    <LinearGradient
      colors={colors[idx]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }, style]}
    >
      <Text style={[styles.avatarText, { fontSize: size * 0.38, color: textColors[idx] }]}>{initials || '?'}</Text>
    </LinearGradient>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 🚨 APP ALERT (THEMED MODAL)
// ─────────────────────────────────────────────────────────────────────────────

const AlertContext = createContext(null);

export function useAppAlert() {
  const context = useContext(AlertContext);
  if (!context) {
    throw new Error('useAppAlert must be used within an AppAlertProvider');
  }
  return context;
}

export function AppAlertProvider({ children }) {
  const [alertConfig, setAlertConfig] = useState(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const showAlert = (title, message, buttons) => {
    // Default single OK button if none provided
    const defaultButtons = [{ text: 'OK', onPress: () => {} }];
    setAlertConfig({ title, message, buttons: buttons || defaultButtons });
    
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
  };

  const closeAlert = (onPress) => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true,
    }).start(() => {
      setAlertConfig(null);
      if (onPress) onPress();
    });
  };

  return (
    <AlertContext.Provider value={{ showAlert }}>
      {children}
      {alertConfig && (
        <Animated.View style={[styles.alertOverlay, { opacity: fadeAnim }]}>
          {/* Use standard View if BlurView isn't configured, or stick to solid bg */}
          <BlurView intensity={20} style={styles.alertBackdrop} tint="dark" />
          <View style={[styles.alertContainer, SHADOWS.lg]}>
            <LinearGradient colors={COLORS.gradients.card} style={styles.alertInner}>
              <Text style={styles.alertTitle}>{alertConfig.title}</Text>
              <Text style={styles.alertMessage}>{alertConfig.message}</Text>
              
              <View style={styles.alertButtonsRow}>
                {alertConfig.buttons.map((btn, idx) => (
                  <TouchableOpacity
                    key={idx}
                    onPress={() => closeAlert(btn.onPress)}
                    style={[
                      styles.alertButton,
                      alertConfig.buttons.length === 2 && idx === 0 && styles.alertButtonCancel, // specific styling if 2 buttons
                    ]}
                  >
                    <Text style={[
                      styles.alertButtonText,
                      alertConfig.buttons.length === 2 && idx === 0 && styles.alertButtonTextCancel,
                      btn.style === 'destructive' && { color: COLORS.status.error }
                    ]}>
                      {btn.text}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </LinearGradient>
          </View>
        </Animated.View>
      )}
    </AlertContext.Provider>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 📋 STYLES
// ─────────────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  gradBtn: {
    borderRadius:      RADIUS.lg,
    paddingVertical:   SPACING[3],
    paddingHorizontal: SPACING[5],
  },
  gradBtnInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  gradBtnIcon:  { fontSize: 18, marginRight: SPACING[2] },
  gradBtnText:  {
    fontSize:      FONTS.sizes.base,
    fontWeight:    '700',
    letterSpacing: 0.5,
  },
  outlineBtn: {
    flexDirection:     'row',
    alignItems:        'center',
    justifyContent:    'center',
    borderWidth:       1.5,
    borderRadius:      RADIUS.lg,
    paddingVertical:   SPACING[3],
    paddingHorizontal: SPACING[5],
  },
  outlineBtnText: { fontSize: FONTS.sizes.base, fontWeight: '600' },
  acceptBtn:  { borderRadius: RADIUS.lg, overflow: 'hidden' },
  acceptGrad: { paddingVertical: SPACING[3], paddingHorizontal: SPACING[5], alignItems: 'center' },
  acceptText: { color: '#fff', fontSize: FONTS.sizes.base, fontWeight: '700' },
  declineBtn: { borderRadius: RADIUS.lg, overflow: 'hidden' },
  inputContainer: { marginBottom: SPACING[4] },
  inputLabel: {
    color:         COLORS.blush,
    fontSize:      FONTS.sizes.sm,
    fontWeight:    '600',
    marginBottom:  SPACING[2],
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  input: {
    backgroundColor: COLORS.background.input,
    borderWidth:     1.5,
    borderColor:     'rgba(255, 173, 208, 0.3)',
    borderRadius:    RADIUS.md,
    paddingVertical:   SPACING[3] + 2,
    paddingHorizontal: SPACING[4],
    color:           COLORS.white,
    fontSize:        FONTS.sizes.base,
  },
  inputError:     { borderColor: COLORS.status.error },
  inputErrorText: { color: COLORS.status.error, fontSize: FONTS.sizes.sm, marginTop: 4 },
  card: {
    backgroundColor: COLORS.background.card,
    borderRadius:    RADIUS.xl,
    borderWidth:     1,
    borderColor:     'rgba(255, 173, 208, 0.15)',
    padding:         SPACING[4],
  },
  badge: {
    paddingHorizontal: SPACING[3],
    paddingVertical:   SPACING[1],
    borderRadius:      RADIUS.full,
  },
  badgeText:     { fontSize: FONTS.sizes.xs, fontWeight: '700', letterSpacing: 0.5 },
  loadingScreen: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: SPACING[4] },
  loadingText:   { color: COLORS.blush, fontSize: FONTS.sizes.base, marginTop: SPACING[3] },
  emptyState: {
    flex:              1,
    alignItems:        'center',
    justifyContent:    'center',
    paddingHorizontal: SPACING[8],
    paddingVertical:   SPACING[12],
  },
  emptyIcon:    { fontSize: 64, marginBottom: SPACING[4] },
  emptyTitle:   { color: COLORS.white, fontSize: FONTS.sizes.xl, fontWeight: '700', textAlign: 'center', marginBottom: SPACING[2] },
  emptyMessage: { color: COLORS.lavender, fontSize: FONTS.sizes.base, textAlign: 'center', lineHeight: 22 },
  sectionHeader: {
    flexDirection:     'row',
    justifyContent:    'space-between',
    alignItems:        'center',
    marginBottom:      SPACING[3],
    paddingHorizontal: SPACING[1],
  },
  sectionTitle:  { color: COLORS.white, fontSize: FONTS.sizes.lg, fontWeight: '700' },
  sectionAction: { color: COLORS.babyPink, fontSize: FONTS.sizes.sm, fontWeight: '600' },
  avatar:        { alignItems: 'center', justifyContent: 'center' },
  avatarText:    { fontWeight: '800' },
  alertOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  alertBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10, 2, 20, 0.85)',
  },
  alertContainer: {
    width: '85%',
    maxWidth: 340,
    borderRadius: RADIUS.xl,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 173, 208, 0.25)',
  },
  alertInner: {
    padding: SPACING[5],
    paddingTop: SPACING[6],
  },
  alertTitle: {
    color: COLORS.white,
    fontSize: FONTS.sizes.lg,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: SPACING[3],
  },
  alertMessage: {
    color: COLORS.lavender,
    fontSize: FONTS.sizes.base,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: SPACING[6],
  },
  alertButtonsRow: {
    flexDirection: 'row',
    gap: SPACING[3],
    justifyContent: 'center',
  },
  alertButton: {
    flex: 1,
    paddingVertical: SPACING[3],
    backgroundColor: 'rgba(255,173,208,0.15)',
    borderRadius: RADIUS.lg,
    alignItems: 'center',
  },
  alertButtonCancel: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(255,173,208,0.2)',
  },
  alertButtonText: {
    color: COLORS.babyPink,
    fontSize: FONTS.sizes.base,
    fontWeight: '700',
  },
  alertButtonTextCancel: {
    color: COLORS.lavender,
    fontWeight: '600',
  },
});
