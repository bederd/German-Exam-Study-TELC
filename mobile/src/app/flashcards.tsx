import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity } from 'react-native';
import { Colors } from '../constants/Colors';
import { useEffect, useState } from 'react';
import { WordsService, Word } from '../services/words';

export default function FlashcardsScreen() {
  const [words, setWords] = useState<Word[]>([]);
  const [error, setError] = useState(false);

  const fetchWords = () => {
    setError(false);
    WordsService.getWords()
      .then(setWords)
      .catch(e => {
        console.error(e);
        setError(true);
      });
  };

  useEffect(() => {
    fetchWords();
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <Text style={styles.title}>Kelimeler</Text>
          <Text style={styles.subtitle}>Öğrendiğiniz Kelimeler ({words.length})</Text>
        </View>

        {error ? (
          <View style={styles.emptyState}>
            <Text style={[styles.emptyText, {color: Colors.error, marginBottom: 10}]}>Kelimeler yüklenemedi.</Text>
            <TouchableOpacity onPress={fetchWords} style={{backgroundColor: Colors.primary, padding: 10, borderRadius: 8}}>
              <Text style={{color: '#fff'}}>Tekrar Dene</Text>
            </TouchableOpacity>
          </View>
        ) : words.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>Henüz hiç kelime kaydetmediniz.</Text>
          </View>
        ) : (
          words.map((w, idx) => (
            <View key={idx} style={styles.wordCard}>
              <View style={styles.wordHeader}>
                <Text style={styles.wordText}>
                  {w.article ? <Text style={styles.article}>{w.article} </Text> : null}
                  {w.word}
                </Text>
                <Text style={styles.wordType}>{w.type}</Text>
              </View>
              <Text style={styles.wordMeaning}>{w.meaning}</Text>
              {w.plural && <Text style={styles.wordDetail}>Çoğul: {w.plural}</Text>}
              {w.example && <Text style={styles.wordDetail}>Örnek: {w.example}</Text>}
            </View>
          ))
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
  emptyState: { padding: 40, alignItems: 'center' },
  emptyText: { color: Colors.textMuted, fontSize: 16 },
  wordCard: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: Colors.primary,
  },
  wordHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  article: { color: Colors.textMuted, fontWeight: 'normal' },
  wordText: { fontSize: 20, fontWeight: 'bold', color: Colors.text },
  wordType: { fontSize: 12, backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, color: Colors.accent },
  wordMeaning: { fontSize: 16, color: Colors.text, marginBottom: 8 },
  wordDetail: { fontSize: 14, color: Colors.textMuted, fontStyle: 'italic', marginTop: 4 }
});
