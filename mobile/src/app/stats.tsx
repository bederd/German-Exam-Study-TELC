import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity } from 'react-native';
import { Colors } from '../constants/Colors';
import { useEffect, useState } from 'react';
import { EngineService } from '../services/engine';

export default function StatsScreen() {
  const [stats, setStats] = useState<any>(null);
  const [error, setError] = useState(false);

  const fetchStats = () => {
    setError(false);
    setStats(null);
    EngineService.getStats('a1')
      .then(setStats)
      .catch(e => {
        console.error(e);
        setError(true);
      });
  };

  useEffect(() => {
    fetchStats();
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <Text style={styles.title}>İstatistikler</Text>
          <Text style={styles.subtitle}>B1 Seviyesi İlerlemeniz</Text>
        </View>

        {error ? (
          <View style={{alignItems: 'center', marginTop: 20}}>
            <Text style={{color: Colors.error, marginBottom: 10}}>İstatistikler yüklenemedi.</Text>
            <TouchableOpacity onPress={fetchStats} style={{backgroundColor: Colors.primary, padding: 10, borderRadius: 8}}>
              <Text style={{color: '#fff'}}>Tekrar Dene</Text>
            </TouchableOpacity>
          </View>
        ) : stats ? (
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{stats.lesen_texts}</Text>
              <Text style={styles.statLabel}>Okuma Metni</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{stats.lesen_fragen}</Text>
              <Text style={styles.statLabel}>Okuma Sorusu</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{stats.grammatik_total}</Text>
              <Text style={styles.statLabel}>Dilbilgisi Sorusu</Text>
            </View>
          </View>
        ) : (
          <Text style={{color: Colors.textMuted}}>Yükleniyor...</Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { padding: 20, paddingBottom: 100 },
  header: { marginTop: 40, marginBottom: 30 },
  title: { fontSize: 32, fontWeight: 'bold', color: Colors.text },
  subtitle: { fontSize: 16, color: Colors.textMuted, marginTop: 4 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  statCard: {
    width: '48%',
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 24,
    marginBottom: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  statValue: { fontSize: 36, fontWeight: 'bold', color: Colors.accent, marginBottom: 8 },
  statLabel: { fontSize: 14, color: Colors.textMuted, textAlign: 'center' }
});
