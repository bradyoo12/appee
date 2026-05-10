import { SafeAreaView, StyleSheet, Text, View } from 'react-native';

// Visual reference: demo/index.html line 633-642 (Slice 0 first-install dashboard preview).
// Only {{HEADLINE}} is substituted in Slice 0 (kickoff plan E3-3); everything else is fixed.
const HEADLINE = '{{HEADLINE}}';

const COLORS = {
  bg: '#FFFFFF',
  text: '#18181B',
  textMuted: '#71717A',
  textFaint: '#A1A1AA',
  brand: '#F97316',
  white: '#FFFFFF',
};

export default function HomeScreen() {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.appName}>내 앱</Text>
        <Text style={styles.tagline}>한 줄: "{HEADLINE}"</Text>

        <View style={styles.heroCard}>
          <Text style={styles.heroVersion}>V0.1.0</Text>
          <Text style={styles.heroTitle}>시작하기</Text>
          <Text style={styles.heroBody}>아직 비어있어요. 카드를 채워보세요.</Text>
        </View>

        <View style={styles.spacer} />
        <Text style={styles.buildLine}>EAS Build #1 · live</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  appName: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  tagline: {
    fontSize: 14,
    color: COLORS.textMuted,
    marginTop: 4,
  },
  heroCard: {
    marginTop: 20,
    backgroundColor: COLORS.brand,
    borderRadius: 14,
    padding: 20,
    shadowColor: COLORS.brand,
    shadowOpacity: 0.18,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 20 },
    elevation: 8,
  },
  heroVersion: {
    fontSize: 11,
    color: COLORS.white,
    opacity: 0.9,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.white,
    marginTop: 4,
  },
  heroBody: {
    fontSize: 14,
    color: COLORS.white,
    opacity: 0.9,
    marginTop: 4,
  },
  spacer: {
    flex: 1,
  },
  buildLine: {
    fontSize: 11,
    color: COLORS.textFaint,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
});
