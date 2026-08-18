import { View, Text, StyleSheet, SafeAreaView, ScrollView, TextInput, TouchableOpacity, Alert, Platform } from 'react-native';
import { Colors } from '../constants/Colors';
import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function SettingsScreen() {
  const [apiKey, setApiKey] = useState('');
  const [level, setLevel] = useState('b1');

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const k = await AsyncStorage.getItem('@df_apikey');
        if (k) setApiKey(k);
        const l = await AsyncStorage.getItem('@df_level');
        if (l) setLevel(l);
      } catch (error) {
        console.error('Settings load error:', error);
      }
    };
    loadSettings();
  }, []);

  const saveSettings = async () => {
    try {
      await AsyncStorage.setItem('@df_apikey', apiKey);
      await AsyncStorage.setItem('@df_level', level);
      if (Platform.OS === 'web') {
        window.alert('Ayarlar kaydedildi.');
      } else {
        Alert.alert('Başarılı', 'Ayarlar kaydedildi.');
      }
    } catch (error) {
      console.error('Settings save error:', error);
      if (Platform.OS === 'web') {
        window.alert('Ayarlar kaydedilirken hata oluştu.');
      } else {
        Alert.alert('Hata', 'Ayarlar kaydedilirken hata oluştu.');
      }
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <Text style={styles.title}>Ayarlar</Text>
          <Text style={styles.subtitle}>Uygulama Tercihleri</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Gemini API Anahtarı (Yazma Değerlendirmesi için)</Text>
          <TextInput 
            style={styles.input}
            value={apiKey}
            onChangeText={setApiKey}
            placeholder="AIzaSy..."
            placeholderTextColor={Colors.textMuted}
            secureTextEntry
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Seviye</Text>
          <View style={styles.levelRow}>
            {['a1', 'a2', 'b1', 'b2'].map(l => (
              <TouchableOpacity 
                key={l}
                style={[styles.levelBtn, level === l && styles.levelBtnActive]}
                onPress={() => setLevel(l)}
              >
                <Text style={[styles.levelBtnText, level === l && styles.levelBtnTextActive]}>
                  {l.toUpperCase()}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <TouchableOpacity style={styles.saveBtn} onPress={saveSettings}>
          <Text style={styles.saveBtnText}>Kaydet</Text>
        </TouchableOpacity>
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
  section: { marginBottom: 24 },
  label: { color: Colors.text, marginBottom: 8, fontSize: 16 },
  input: {
    backgroundColor: Colors.card,
    borderRadius: 8,
    padding: 16,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  levelRow: { flexDirection: 'row', justifyContent: 'space-between' },
  levelBtn: {
    flex: 1,
    padding: 12,
    backgroundColor: Colors.card,
    borderRadius: 8,
    marginHorizontal: 4,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  levelBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  levelBtnText: { color: Colors.textMuted, fontWeight: 'bold' },
  levelBtnTextActive: { color: '#fff' },
  saveBtn: {
    backgroundColor: Colors.success,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
  },
  saveBtnText: { color: '#fff', fontSize: 18, fontWeight: 'bold' }
});
