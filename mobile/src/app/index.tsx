import { View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView } from 'react-native';
import { Colors } from '../constants/Colors';
import { useRouter } from 'expo-router';

export default function HomeScreen() {
  const router = useRouter();

  const handleModuleClick = (moduleId: string) => {
    console.log('Navigating to', moduleId);
    router.push(`/exercises/${moduleId}`);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <Text style={styles.title}>Deutsch<Text style={styles.titleAccent}>Fit</Text></Text>
          <Text style={styles.subtitle}>TELC B1 / Goethe B1 Sınav Hazırlık</Text>
        </View>

        <View style={styles.grid}>
          <TouchableOpacity style={[styles.card, { borderTopColor: '#3b82f6' }]} onPress={() => handleModuleClick('lesen')}>
            <Text style={styles.cardIcon}>📖</Text>
            <Text style={styles.cardTitle}>Okuma Anlama</Text>
            <Text style={styles.cardDesc}>Metinler ve Sorular</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.card, { borderTopColor: '#eab308' }]} onPress={() => handleModuleClick('hoeren')}>
            <Text style={styles.cardIcon}>🎧</Text>
            <Text style={styles.cardTitle}>Dinleme Anlama</Text>
            <Text style={styles.cardDesc}>Sesli Metinler ve Sorular</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.card, { borderTopColor: '#ec4899' }]} onPress={() => handleModuleClick('grammatik')}>
            <Text style={styles.cardIcon}>📝</Text>
            <Text style={styles.cardTitle}>Dilbilgisi</Text>
            <Text style={styles.cardDesc}>Fiiller ve Cümle Yapısı</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.card, { borderTopColor: '#10b981' }]} onPress={() => handleModuleClick('schreiben')}>
            <Text style={styles.cardIcon}>✍️</Text>
            <Text style={styles.cardTitle}>Yazma</Text>
            <Text style={styles.cardDesc}>Essay ve Yapay Zeka Değerlendirme</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.quickStart}>
          <TouchableOpacity style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>Hızlı Başla (Rastgele)</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scroll: {
    padding: 20,
    paddingBottom: 100,
  },
  header: {
    marginTop: 40,
    marginBottom: 30,
    alignItems: 'center',
  },
  title: {
    fontSize: 36,
    fontWeight: '800',
    color: Colors.text,
    letterSpacing: 1,
  },
  titleAccent: {
    color: Colors.accent,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.textMuted,
    marginTop: 8,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  card: {
    width: '48%',
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderTopWidth: 4,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
  },
  cardIcon: {
    fontSize: 32,
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 6,
  },
  cardDesc: {
    fontSize: 12,
    color: Colors.textMuted,
    lineHeight: 18,
  },
  quickStart: {
    marginTop: 20,
  },
  primaryButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  }
});
