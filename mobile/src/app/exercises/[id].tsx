import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, ActivityIndicator, TextInput, Modal, Alert,
  Animated,
} from 'react-native';
import { Colors } from '../../constants/Colors';
import { useEffect, useState, useRef, useCallback } from 'react';
import { EngineService } from '../../services/engine';
import { GeminiService } from '../../services/gemini';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Audio } from 'expo-av';

// ─── Audio Map ─────────────────────────────────────────────────────────────
// DB'deki audio alanı "/audio/a1/dosya.mp3" formatında.
// Expo require() dinamik path desteklemediği için statik bir map kullanıyoruz.
const AUDIO_MAP: Record<string, any> = {
  '/audio/a1/1.17_begegnungen_a1.mp3': require('../../../assets/audio/a1/1.17_begegnungen_a1.mp3'),
  '/audio/a1/1.18_begegnungen_a1.mp3': require('../../../assets/audio/a1/1.18_begegnungen_a1.mp3'),
  '/audio/a1/1.19_begegnungen_a1.mp3': require('../../../assets/audio/a1/1.19_begegnungen_a1.mp3'),
  '/audio/a1/1.21_begegnungen_a1.mp3': require('../../../assets/audio/a1/1.21_begegnungen_a1.mp3'),
  '/audio/a1/1.23_begegnungen_a1.mp3': require('../../../assets/audio/a1/1.23_begegnungen_a1.mp3'),
  '/audio/a1/1.27_begegnungen_a1.mp3': require('../../../assets/audio/a1/1.27_begegnungen_a1.mp3'),
  '/audio/a1/1.30_begegnungen_a1.mp3': require('../../../assets/audio/a1/1.30_begegnungen_a1.mp3'),
  '/audio/a1/21_spektrum_a1-2.mp3': require('../../../assets/audio/a1/21_spektrum_a1-2.mp3'),
  '/audio/a1/28_spektrum_a1-2.mp3': require('../../../assets/audio/a1/28_spektrum_a1-2.mp3'),
  '/audio/a1/36_spektrum_a1-1.mp3': require('../../../assets/audio/a1/36_spektrum_a1-1.mp3'),
  '/audio/a1/50_spektrum_a1-1.mp3': require('../../../assets/audio/a1/50_spektrum_a1-1.mp3'),
  '/audio/a1/53_spektrum_a1-2.mp3': require('../../../assets/audio/a1/53_spektrum_a1-2.mp3'),
  '/audio/a1/57_spektrum_a1-1.mp3': require('../../../assets/audio/a1/57_spektrum_a1-1.mp3'),
  '/audio/a1/58_spektrum_a1-1.mp3': require('../../../assets/audio/a1/58_spektrum_a1-1.mp3'),
  '/audio/a1/64_spektrum_a1-1.mp3': require('../../../assets/audio/a1/64_spektrum_a1-1.mp3'),
};

// ─── Audio Player Component ────────────────────────────────────────────────
function AudioPlayer({ audioPath }: { audioPath: string | null }) {
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      // Cleanup on unmount
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, [sound]);

  const loadAudio = useCallback(async () => {
    if (!audioPath) {
      setError('Bu metin için ses dosyası henüz eklenmedi.');
      return;
    }

    const audioSource = AUDIO_MAP[audioPath];
    if (!audioSource) {
      setError(`Ses dosyası bulunamadı: ${audioPath}`);
      return;
    }

    try {
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
      });

      const { sound: newSound } = await Audio.Sound.createAsync(
        audioSource,
        { shouldPlay: false },
        (status) => {
          if (status.isLoaded) {
            setPosition(status.positionMillis || 0);
            setDuration(status.durationMillis || 0);
            setIsPlaying(status.isPlaying || false);
            if (status.didJustFinish) {
              setIsPlaying(false);
            }
          }
        }
      );
      setSound(newSound);
      setIsLoaded(true);
    } catch (e: any) {
      setError(`Ses yüklenemedi: ${e.message}`);
    }
  }, [audioPath]);

  useEffect(() => {
    loadAudio();
  }, [loadAudio]);

  const togglePlay = async () => {
    if (!sound) return;
    if (isPlaying) {
      await sound.pauseAsync();
    } else {
      const status = await sound.getStatusAsync();
      if (status.isLoaded && status.didJustFinish) {
        await sound.setPositionAsync(0);
      }
      await sound.playAsync();
    }
  };

  const seekBack = async () => {
    if (!sound) return;
    const newPos = Math.max(0, position - 10000);
    await sound.setPositionAsync(newPos);
  };

  const seekForward = async () => {
    if (!sound) return;
    const newPos = Math.min(duration, position + 10000);
    await sound.setPositionAsync(newPos);
  };

  const formatTime = (ms: number) => {
    const totalSec = Math.floor(ms / 1000);
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    return `${min}:${sec.toString().padStart(2, '0')}`;
  };

  if (error) {
    return (
      <View style={audioStyles.container}>
        <View style={audioStyles.errorBox}>
          <Text style={audioStyles.errorIcon}>🔇</Text>
          <Text style={audioStyles.errorText}>{error}</Text>
        </View>
      </View>
    );
  }

  if (!isLoaded) {
    return (
      <View style={audioStyles.container}>
        <ActivityIndicator color={Colors.accent} />
        <Text style={{ color: Colors.textMuted, marginTop: 8 }}>Ses yükleniyor...</Text>
      </View>
    );
  }

  const progress = duration > 0 ? position / duration : 0;

  return (
    <View style={audioStyles.container}>
      <View style={audioStyles.controls}>
        <TouchableOpacity onPress={seekBack} style={audioStyles.seekBtn}>
          <Text style={audioStyles.seekBtnText}>⏪ 10s</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={togglePlay} style={audioStyles.playBtn}>
          <Text style={audioStyles.playBtnText}>{isPlaying ? '⏸' : '▶️'}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={seekForward} style={audioStyles.seekBtn}>
          <Text style={audioStyles.seekBtnText}>10s ⏩</Text>
        </TouchableOpacity>
      </View>
      <View style={audioStyles.progressBar}>
        <View style={[audioStyles.progressFill, { width: `${progress * 100}%` }]} />
      </View>
      <Text style={audioStyles.timeText}>{formatTime(position)} / {formatTime(duration)}</Text>
    </View>
  );
}

const audioStyles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    marginVertical: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,240,255,0.15)',
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  playBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  playBtnText: { fontSize: 24 },
  seekBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  seekBtnText: { color: Colors.textMuted, fontSize: 13 },
  progressBar: {
    width: '100%',
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 2,
    marginTop: 14,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.accent,
    borderRadius: 2,
  },
  timeText: {
    color: Colors.textMuted,
    fontSize: 12,
    marginTop: 6,
  },
  errorBox: {
    alignItems: 'center',
    gap: 8,
  },
  errorIcon: { fontSize: 28 },
  errorText: {
    color: Colors.textMuted,
    fontSize: 14,
    textAlign: 'center',
  },
});

// ─── Main Exercise Screen ──────────────────────────────────────────────────
export default function ExerciseScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState(false);

  // Answers state
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [textAnswers, setTextAnswers] = useState<Record<string, string>>({});
  const [schreibenText, setSchreibenText] = useState('');

  // Grammatik states
  const [grammatikType, setGrammatikType] = useState('luecke'); // 'luecke', 'konjugation', 'satzstellung', 'text-luecke'
  const [satzSelectedWords, setSatzSelectedWords] = useState<Record<string, string[]>>({});
  const [satzWordIndices, setSatzWordIndices] = useState<Record<string, number[]>>({});
  const [textLueckeAnswers, setTextLueckeAnswers] = useState<Record<string, string>>({});

  // Check results state (for Lesen & Hören)
  const [checked, setChecked] = useState(false);
  const [results, setResults] = useState<Record<string, boolean>>({});

  // Word analysis modal
  const [analysisModalVisible, setAnalysisModalVisible] = useState(false);
  const [analysisWord, setAnalysisWord] = useState('');
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);

  // Schreiben evaluation
  const [evalLoading, setEvalLoading] = useState(false);
  const [evalResult, setEvalResult] = useState<any>(null);

  // Word selection bar (for long-press analyze)
  const [selectedWord, setSelectedWord] = useState<string | null>(null);

  // Hardcoded API key from .env as fallback for mobile
  const FALLBACK_API_KEY = 'AQ.Ab8RN6Kr-zf3QYgrMDZYfA2fXYnnwl6__CnmXNgcULwO505b3w';
  const getApiKey = async () => {
    const stored = await AsyncStorage.getItem('@df_apikey');
    return stored || FALLBACK_API_KEY;
  };
  const analyzeBarAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loadExercise = async () => {
      setLoading(true);
      setData(null);
      setChecked(false);
      setResults({});
      setAnswers({});
      setTextAnswers({});
      setSatzSelectedWords({});
      setSatzWordIndices({});
      setTextLueckeAnswers({});
      setEvalResult(null);
      setSchreibenText('');
      setError(false);
      try {
        const level = 'a1';
        let exData = null;
        if (id === 'lesen') {
          exData = await EngineService.getLesenRandom(level);
        } else if (id === 'grammatik') {
          exData = await EngineService.getGrammatik(level, 'text-luecke', 1);
        } else if (id === 'hoeren') {
          exData = await EngineService.getHoeren(level, 1);
        } else if (id === 'schreiben') {
          exData = await EngineService.getSchreiben(level);
        }
        setData(exData);
      } catch (e) {
        console.error(e);
        setError(true);
      } finally {
        setLoading(false);
      }
    };
    loadExercise();
  }, [id]);

  const handleSwitchGrammatikType = async (newType: string) => {
    if (newType === grammatikType) return;
    setGrammatikType(newType);
    setChecked(false);
    setResults({});
    setAnswers({});
    setTextAnswers({});
    setSatzSelectedWords({});
    setSatzWordIndices({});
    setTextLueckeAnswers({});
    setLoading(true);
    try {
      const level = 'a1';
      const count = newType === 'text-luecke' ? 1 : 5;
      const exData = await EngineService.getGrammatik(level, newType, count);
      setData(exData);
    } catch (e) {
      console.error(e);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  // ── Handlers ──

  const handleOptionSelect = (qId: string, option: string) => {
    if (checked) return; // Don't allow changes after check
    setAnswers(prev => ({ ...prev, [qId]: option }));
  };

  const handleAddSatzWord = (qId: string, word: string, wIdx: number) => {
    if (checked) return;
    setSatzSelectedWords(prev => ({
      ...prev,
      [qId]: [...(prev[qId] || []), word]
    }));
    setSatzWordIndices(prev => ({
      ...prev,
      [qId]: [...(prev[qId] || []), wIdx]
    }));
  };

  const handleRemoveSatzWord = (qId: string, removeIdx: number) => {
    if (checked) return;
    setSatzSelectedWords(prev => {
      const current = [...(prev[qId] || [])];
      current.splice(removeIdx, 1);
      return { ...prev, [qId]: current };
    });
    setSatzWordIndices(prev => {
      const current = [...(prev[qId] || [])];
      current.splice(removeIdx, 1);
      return { ...prev, [qId]: current };
    });
  };

  const handleResetSatz = (qId: string) => {
    if (checked) return;
    setSatzSelectedWords(prev => ({ ...prev, [qId]: [] }));
    setSatzWordIndices(prev => ({ ...prev, [qId]: [] }));
  };

  const handleCheckAnswers = (questions: any[]) => {
    const newResults: Record<string, boolean> = {};

    if (id === 'grammatik' && grammatikType === 'satzstellung') {
      questions.forEach((q: any) => {
        const selected = satzSelectedWords[q.id] || [];
        const userSentence = selected.join(' ').trim().toLowerCase();
        const targetSentence = (q.satz || '').trim().toLowerCase();
        newResults[q.id] = userSentence === targetSentence;
      });
      setResults(newResults);
      setChecked(true);
      return;
    }

    if (id === 'grammatik' && grammatikType === 'text-luecke') {
      const q = questions[0];
      if (!q) return;
      const answersObj = q.answers || {};
      Object.keys(answersObj).forEach((key) => {
        const userAns = (textLueckeAnswers[key] || '').trim().toLowerCase();
        const targetAns = String(answersObj[key] || '').trim().toLowerCase();
        newResults[key] = userAns === targetAns;
      });
      setResults(newResults);
      setChecked(true);
      return;
    }

    questions.forEach((q: any) => {
      // For text-type questions, use textAnswers
      if (q.typ === 'text') {
        const userText = textAnswers[q.id]?.trim();
        if (!userText || !q.antwort || !q.antwort.trim()) {
          return;
        }
        newResults[q.id] = userText.toLowerCase() === q.antwort.toLowerCase().trim();
        return;
      }

      const userAnswer = answers[q.id];
      if (!userAnswer) {
        newResults[q.id] = false;
        return;
      }
      // MC/RF: compare
      if (q.antwort) {
        const correct = q.antwort.toLowerCase().trim();
        const user = userAnswer.toLowerCase().trim();
        if (correct.length <= 2) {
          const optIndex = (q.optionen || []).indexOf(userAnswer);
          const letters = ['a', 'b', 'c', 'd', 'e'];
          newResults[q.id] = letters[optIndex] === correct;
        } else {
          newResults[q.id] = user === correct || userAnswer === q.antwort;
        }
      }
    });
    setResults(newResults);
    setChecked(true);
  };

  const handleWordLongPress = (word: string) => {
    const clean = word.replace(/[^a-zA-ZäöüßÄÖÜ]/g, '');
    if (clean.length <= 1) return;
    setSelectedWord(clean);
    analyzeBarAnim.setValue(0);
    Animated.spring(analyzeBarAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 120,
      friction: 8,
    }).start();
  };

  const handleDismissWordBar = () => {
    Animated.timing(analyzeBarAnim, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true,
    }).start(() => setSelectedWord(null));
  };

  const handleAnalyzeSelectedWord = () => {
    if (selectedWord) {
      setAnalysisWord(selectedWord);
      handleDismissWordBar();
      setAnalysisModalVisible(true);
      // Auto-trigger analysis
      triggerAnalysis(selectedWord);
    }
  };

  const triggerAnalysis = async (word: string) => {
    setAnalysisLoading(true);
    setAnalysisResult(null);
    try {
      const apiKey = await getApiKey();
      const result = await GeminiService.analyzeWord(word, apiKey);
      if (result.error) {
        Alert.alert('Hata', result.error);
      } else {
        setAnalysisResult(result.analysis);
      }
    } catch (e: any) {
      Alert.alert('Hata', e.message);
    } finally {
      setAnalysisLoading(false);
    }
  };

  const handleAnalyzeWord = async () => {
    if (!analysisWord.trim()) return;
    triggerAnalysis(analysisWord.trim());
  };

  const handleEvaluateSchreiben = async () => {
    if (!schreibenText.trim()) return;
    setEvalLoading(true);
    try {
      const apiKey = await getApiKey();
      const result = await GeminiService.evaluateSchreiben({
        thema: data?.thema || '',
        kontext: data?.kontext || '',
        fragen: data?.fragen || [],
        text: schreibenText,
        typ: data?.typ || 'popquiz'
      }, apiKey);
      if (result.error) {
        Alert.alert('Hata', result.error);
      } else {
        setEvalResult(result);
      }
    } catch (e: any) {
      Alert.alert('Hata', e.message);
    } finally {
      setEvalLoading(false);
    }
  };

  // ── Reusable: Render words with long-press ──
  const renderSelectableText = (text: string | undefined | null, textStyle?: any) => {
    if (!text) return <Text style={[styles.bodyText, textStyle]}></Text>;
    const words = text.split(/(\s+)/);
    return (
      <Text style={[styles.bodyText, textStyle]}>
        {words.map((segment, idx) => {
          const isWord = /\S/.test(segment);
          if (!isWord) return <Text key={idx}>{segment}</Text>;
          const clean = segment.replace(/[^a-zA-ZäöüßÄÖÜ]/g, '');
          const isSelected = selectedWord === clean && clean.length > 1;
          return (
            <Text
              key={idx}
              onLongPress={() => handleWordLongPress(segment)}
              style={isSelected ? styles.wordHighlighted : undefined}
            >
              {segment}
            </Text>
          );
        })}
      </Text>
    );
  };

  // ── Reload exercise (for "Sonraki Soru" button) ──
  const reloadExercise = async () => {
    setChecked(false);
    setResults({});
    setAnswers({});
    setTextAnswers({});
    setEvalResult(null);
    setSchreibenText('');
    setData(null);
    setLoading(true);
    try {
      const level = 'a1';
      let exData = null;
      if (id === 'lesen') exData = await EngineService.getLesenRandom(level);
      else if (id === 'grammatik') exData = await EngineService.getGrammatik(level, 'text-luecke', 1);
      else if (id === 'hoeren') exData = await EngineService.getHoeren(level, 1);
      else if (id === 'schreiben') exData = await EngineService.getSchreiben(level);
      setData(exData);
    } catch (e) {
      console.error(e);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  // ── Score summary + navigation buttons ──
  const renderScoreSummary = (questions: any[]) => {
    if (!checked) return null;
    const checkable = questions.filter(q => q.typ !== 'text' || (q.antwort && q.antwort.trim()));
    const correct = checkable.filter(q => results[q.id]).length;
    const total = checkable.length;
    const pct = total > 0 ? Math.round((correct / total) * 100) : 0;
    const color = pct >= 70 ? Colors.success : pct >= 40 ? '#eab308' : Colors.error;
    return (
      <View>
        <View style={[styles.scoreCard, { borderColor: color }]}>
          <Text style={[styles.scoreText, { color }]}>{correct} / {total} Doğru ({pct}%)</Text>
          <Text style={{ color: Colors.textMuted, marginTop: 4 }}>
            {pct >= 70 ? '🎉 Harika!' : pct >= 40 ? '💪 İyi gidiyorsun!' : '📚 Daha fazla çalışmaya devam!'}
          </Text>
        </View>
        <View style={styles.navButtonsRow}>
          <TouchableOpacity style={styles.navBtnPrimary} onPress={reloadExercise}>
            <Text style={styles.primaryBtnText}>Sonraki Soru →</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.navBtnSecondary} onPress={() => router.back()}>
            <Text style={styles.navBtnSecondaryText}>Ana Menüye Dön</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // ── Option style based on check results ──
  const getOptionStyle = (qId: string, option: string, q: any) => {
    if (!checked) {
      return answers[qId] === option ? styles.optionBtnSelected : {};
    }
    // After check, show correct/wrong
    const isUserChoice = answers[qId] === option;
    const correctAnswer = q.antwort?.toLowerCase().trim();
    
    let isCorrectOption = false;
    if (correctAnswer && correctAnswer.length <= 2) {
      const optIndex = (q.optionen || []).indexOf(option);
      const letters = ['a', 'b', 'c', 'd', 'e'];
      isCorrectOption = letters[optIndex] === correctAnswer;
    } else {
      isCorrectOption = option.toLowerCase().trim() === correctAnswer;
    }

    if (isCorrectOption) {
      return styles.optionBtnCorrect;
    }
    if (isUserChoice && !results[qId]) {
      return styles.optionBtnWrong;
    }
    return {};
  };

  // ─── Render: LESEN ───────────────────────────────────────────────────────
  const renderLesen = () => {
    if (!data) return null;
    const fragen = data.fragen || [];
    return (
      <View>
        <Text style={styles.contentTitle}>{data.titel}</Text>
        {renderSelectableText(data.text)}

        <Text style={[styles.contentTitle, { marginTop: 24 }]}>Sorular</Text>
        {fragen.map((q: any, idx: number) => (
          <View key={q.id || idx} style={styles.questionBlock}>
            <Text style={styles.questionText}>
              {idx + 1}. {q.frage || q.aussage || ''}
            </Text>
            {q.typ === 'rf' ? (
              // Richtig/Falsch
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
                {['richtig', 'falsch'].map((opt) => (
                  <TouchableOpacity
                    key={opt}
                    style={[
                      styles.rfBtn,
                      answers[q.id] === opt && (checked
                        ? (results[q.id] ? styles.optionBtnCorrect : styles.optionBtnWrong)
                        : styles.optionBtnSelected),
                      checked && q.antwort?.toLowerCase() === opt && styles.optionBtnCorrect,
                    ]}
                    onPress={() => handleOptionSelect(q.id, opt)}
                    disabled={checked}
                  >
                    <Text style={styles.optionText}>
                      {opt === 'richtig' ? '✓ Richtig' : '✕ Falsch'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              // MC
              (q.optionen || []).map((opt: string, oIdx: number) => (
                <TouchableOpacity
                  key={oIdx}
                  style={[styles.optionBtn, getOptionStyle(q.id, opt, q)]}
                  onPress={() => handleOptionSelect(q.id, opt)}
                  disabled={checked}
                >
                  <Text style={styles.optionText}>{opt}</Text>
                </TouchableOpacity>
              ))
            )}
            {/* Explanation after check */}
            {checked && q.erklaerung && (
              <View style={styles.explanationBox}>
                <Text style={styles.explanationLabel}>Açıklama:</Text>
                <Text style={styles.explanationText}>{q.erklaerung}</Text>
              </View>
            )}
          </View>
        ))}

        {/* Check / Results buttons */}
        {!checked ? (
          <TouchableOpacity
            style={[styles.primaryBtn, { marginTop: 20 }]}
            onPress={() => handleCheckAnswers(fragen)}
          >
            <Text style={styles.primaryBtnText}>✓ Kontrol Et</Text>
          </TouchableOpacity>
        ) : (
          renderScoreSummary(fragen)
        )}
      </View>
    );
  };

  // Helper to render text-luecke inline inputs
  const renderTextLueckeWithInputs = (q: any) => {
    const textStr = q.text || '';
    const regex = /\{([a-zA-Z0-9_]+)\}/g;
    const elements = [];
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(textStr)) !== null) {
      const gapKey = match[1];
      const textBefore = textStr.substring(lastIndex, match.index);
      if (textBefore) {
        elements.push(<Text key={`text-${lastIndex}`} style={styles.bodyText}>{textBefore}</Text>);
      }

      const targetAns = String(q.answers?.[gapKey] || '').trim().toLowerCase();
      const userAns = (textLueckeAnswers[gapKey] || '').trim().toLowerCase();
      const isCorrect = checked && userAns === targetAns;

      elements.push(
        <TextInput
          key={`input-${gapKey}`}
          style={[
            styles.inlineInput,
            checked && (isCorrect ? styles.inlineInputCorrect : styles.inlineInputWrong)
          ]}
          value={textLueckeAnswers[gapKey] || ''}
          onChangeText={(val) => setTextLueckeAnswers(prev => ({ ...prev, [gapKey]: val }))}
          editable={!checked}
          placeholder={gapKey}
          placeholderTextColor={Colors.textMuted}
          autoCapitalize="none"
        />
      );

      lastIndex = regex.lastIndex;
    }

    const textAfter = textStr.substring(lastIndex);
    if (textAfter) {
      elements.push(<Text key={`text-end`} style={styles.bodyText}>{textAfter}</Text>);
    }

    return elements;
  };

  // ─── Render: GRAMMATIK (Fiil Yerleştirme - Metin) ────────────────────────
  const renderGrammatik = () => {
    if (!data || !Array.isArray(data)) return null;

    return (
      <View>
        <Text style={styles.contentTitle}>Fiil Yerleştirme (Metin)</Text>
        {data.map((q: any, idx: number) => {
          const wordBank = q.word_bank || q.wordBank || [];
          return (
            <View key={q.id || idx}>
              {q.instruction ? <Text style={[styles.questionText, { marginBottom: 12 }]}>{q.instruction}</Text> : null}

              {wordBank.length > 0 && (
                <View style={styles.wordBankContainer}>
                  <Text style={styles.wordBankTitle}>Fiil Havuzu (Uygun çekimle yazın):</Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                    {wordBank.map((w: string, wIdx: number) => (
                      <View key={wIdx} style={styles.wordBankBadge}>
                        <Text style={styles.wordBankBadgeText}>{w}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              <View style={styles.textLueckeCard}>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' }}>
                  {renderTextLueckeWithInputs(q)}
                </View>
              </View>

              {checked && q.answers && (
                <View style={styles.explanationBox}>
                  <Text style={styles.explanationLabel}>Doğru Cevaplar:</Text>
                  {Object.entries(q.answers).map(([key, val]: [string, any]) => {
                    const userVal = (textLueckeAnswers[key] || '').trim();
                    const isOk = userVal.toLowerCase() === String(val).trim().toLowerCase();
                    return (
                      <Text key={key} style={{ color: isOk ? Colors.success : Colors.error, fontSize: 14, marginTop: 2 }}>
                        {key}. {val} {isOk ? '✓' : `(Sizin cevabınız: "${userVal || 'boş'}")`}
                      </Text>
                    );
                  })}
                </View>
              )}
            </View>
          );
        })}

        {/* Check & Navigation */}
        {!checked ? (
          <TouchableOpacity
            style={[styles.primaryBtn, { marginTop: 20 }]}
            onPress={() => handleCheckAnswers(data)}
          >
            <Text style={styles.primaryBtnText}>✓ Kontrol Et</Text>
          </TouchableOpacity>
        ) : (
          renderScoreSummary(data)
        )}
      </View>
    );
  };

  // ─── Render: SCHREIBEN ───────────────────────────────────────────────────
  const renderSchreiben = () => {
    if (!data) return null;
    // FIX: null guard for fragen and tipps — was causing crash
    const fragen = data.fragen || [];
    const tipps = data.tipps || [];
    return (
      <View>
        <Text style={styles.contentTitle}>{data.thema || 'Yazma Ödevi'}</Text>
        {data.kontext ? renderSelectableText(data.kontext) : null}

        {fragen.length > 0 && (
          <View style={styles.questionBlock}>
            <Text style={[styles.questionText, { marginBottom: 8 }]}>Cevaplamanız gerekenler:</Text>
            {fragen.map((f: any, i: number) => {
              const textVal = typeof f === 'object' ? (f.frage || f.aussage || f.text || JSON.stringify(f)) : String(f);
              return <Text key={i} style={styles.bulletText}>• {textVal}</Text>;
            })}
          </View>
        )}

        {tipps.length > 0 && (
          <View style={[styles.tipsBox, { marginTop: 12 }]}>
            <Text style={styles.tipsTitle}>💡 İpuçları</Text>
            {tipps.map((t: any, i: number) => {
              const textVal = typeof t === 'object' ? (t.tipp || t.text || JSON.stringify(t)) : String(t);
              return <Text key={i} style={styles.tipsText}>• {textVal}</Text>;
            })}
          </View>
        )}

        <TextInput
          style={styles.textArea}
          multiline
          placeholder="Metninizi buraya yazın..."
          placeholderTextColor={Colors.textMuted}
          value={schreibenText}
          onChangeText={setSchreibenText}
        />

        {/* Word count */}
        {schreibenText.trim().length > 0 && (
          <Text style={styles.wordCount}>
            {schreibenText.trim().split(/\s+/).length} / {data.mindestwoerter || 30} kelime
          </Text>
        )}

        <TouchableOpacity
          style={[styles.primaryBtn, evalLoading && { opacity: 0.7 }]}
          onPress={handleEvaluateSchreiben}
          disabled={evalLoading || !schreibenText.trim()}
        >
          {evalLoading ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <ActivityIndicator color="#fff" />
              <Text style={styles.primaryBtnText}>Değerlendiriliyor...</Text>
            </View>
          ) : (
            <Text style={styles.primaryBtnText}>🤖 Değerlendir (Yapay Zeka)</Text>
          )}
        </TouchableOpacity>

        {evalResult && (
          <View style={[styles.evalCard, { marginTop: 20 }]}>
            <Text style={styles.contentTitle}>Değerlendirme Sonucu</Text>
            <View style={styles.scoreRow}>
              <View style={styles.scoreItem}>
                <Text style={[styles.scoreNumber, { color: Colors.accent }]}>{evalResult.total_score}</Text>
                <Text style={styles.scoreLabel}>/ 100</Text>
              </View>
              <View style={styles.scoreItem}>
                <Text style={[styles.scoreNumber, { color: '#3b82f6' }]}>{evalResult.content_score}</Text>
                <Text style={styles.scoreLabel}>İçerik /40</Text>
              </View>
              <View style={styles.scoreItem}>
                <Text style={[styles.scoreNumber, { color: '#10b981' }]}>{evalResult.grammar_score}</Text>
                <Text style={styles.scoreLabel}>Gramer /60</Text>
              </View>
            </View>

            {evalResult.feedback_summary && (
              <Text style={[styles.bodyText, { marginTop: 12 }]}>{evalResult.feedback_summary}</Text>
            )}

            {(evalResult.errors || []).length > 0 && (
              <View style={{ marginTop: 16 }}>
                <Text style={[styles.contentTitle, { fontSize: 18 }]}>Hatalar</Text>
                {evalResult.errors.map((err: any, i: number) => (
                  <View key={i} style={styles.errorItem}>
                    <View style={styles.errorBadge}>
                      <Text style={styles.errorBadgeText}>{err.error_type}</Text>
                    </View>
                    <Text style={styles.errorOriginal}>{err.original_segment}</Text>
                    <Text style={styles.errorCorrection}>→ {err.correction}</Text>
                    <Text style={styles.errorExplanation}>{err.explanation}</Text>
                  </View>
                ))}
              </View>
            )}

            {evalResult.improved_text && (
              <View style={{ marginTop: 16 }}>
                <Text style={[styles.contentTitle, { fontSize: 18 }]}>Düzeltilmiş Metin</Text>
                <View style={styles.improvedTextBox}>
                  <Text style={styles.bodyText}>{evalResult.improved_text}</Text>
                </View>
              </View>
            )}
          </View>
        )}
      </View>
    );
  };

  // ─── Render: HÖREN ───────────────────────────────────────────────────────
  const renderHoerenQuestion = (q: any, idx: number) => {
    if (q.typ === 'text') {
      // Open-ended text input question
      return (
        <View key={q.id || idx} style={styles.questionBlock}>
          <Text style={styles.questionText}>
            {idx + 1}. {q.frage || q.aussage || ''}
          </Text>
          <TextInput
            style={styles.textInputAnswer}
            placeholder="Cevabınızı yazın..."
            placeholderTextColor={Colors.textMuted}
            value={textAnswers[q.id] || ''}
            onChangeText={(val) => setTextAnswers(prev => ({ ...prev, [q.id]: val }))}
            editable={!checked}
            multiline
          />
          {checked && q.antwort && q.antwort.trim() && (
            <View style={styles.explanationBox}>
              <Text style={styles.explanationLabel}>Doğru Cevap:</Text>
              <Text style={styles.explanationText}>{q.antwort}</Text>
            </View>
          )}
        </View>
      );
    }

    if (q.typ === 'rf') {
      // Richtig/Falsch
      return (
        <View key={q.id || idx} style={styles.questionBlock}>
          <Text style={styles.questionText}>
            {idx + 1}. {q.frage || q.aussage || ''}
          </Text>
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
            {['Richtig', 'Falsch'].map((opt) => (
              <TouchableOpacity
                key={opt}
                style={[
                  styles.rfBtn,
                  answers[q.id] === opt && (checked
                    ? (results[q.id] ? styles.optionBtnCorrect : styles.optionBtnWrong)
                    : styles.optionBtnSelected),
                  checked && q.antwort === opt && styles.optionBtnCorrect,
                ]}
                onPress={() => handleOptionSelect(q.id, opt)}
                disabled={checked}
              >
                <Text style={styles.optionText}>
                  {opt === 'Richtig' ? '✓ Richtig' : '✕ Falsch'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          {checked && q.erklaerung && q.erklaerung.trim() && (
            <View style={styles.explanationBox}>
              <Text style={styles.explanationLabel}>Açıklama:</Text>
              <Text style={styles.explanationText}>{q.erklaerung}</Text>
            </View>
          )}
        </View>
      );
    }

    // MC (default)
    return (
      <View key={q.id || idx} style={styles.questionBlock}>
        <Text style={styles.questionText}>
          {idx + 1}. {q.frage || q.aussage || ''}
        </Text>
        {(q.optionen || []).map((opt: string, oIdx: number) => (
          <TouchableOpacity
            key={oIdx}
            style={[styles.optionBtn, getOptionStyle(q.id, opt, q)]}
            onPress={() => handleOptionSelect(q.id, opt)}
            disabled={checked}
          >
            <Text style={styles.optionText}>{opt}</Text>
          </TouchableOpacity>
        ))}
        {checked && q.erklaerung && q.erklaerung.trim() && (
          <View style={styles.explanationBox}>
            <Text style={styles.explanationLabel}>Açıklama:</Text>
            <Text style={styles.explanationText}>{q.erklaerung}</Text>
          </View>
        )}
      </View>
    );
  };

  const renderHoeren = () => {
    if (!data || !data[0]) return null;
    const t = data[0];
    const fragen = t.fragen || [];
    return (
      <View>
        {t.kontext && <Text style={styles.contextBadge}>🎧 {t.kontext}</Text>}

        {/* Audio Player */}
        <AudioPlayer audioPath={t.audio || null} />

        <Text style={[styles.contentTitle, { marginTop: 20 }]}>Sorular</Text>
        {fragen.map((q: any, idx: number) => renderHoerenQuestion(q, idx))}

        {/* Check button */}
        {fragen.length > 0 && !checked ? (
          <TouchableOpacity
            style={[styles.primaryBtn, { marginTop: 20 }]}
            onPress={() => handleCheckAnswers(fragen)}
          >
            <Text style={styles.primaryBtnText}>✓ Kontrol Et</Text>
          </TouchableOpacity>
        ) : fragen.length > 0 ? (
          renderScoreSummary(fragen)
        ) : null}
      </View>
    );
  };

  // ─── Loading State ───────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={{ color: Colors.textMuted, marginTop: 12 }}>Yükleniyor...</Text>
      </View>
    );
  }

  // ─── Main Render ─────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>{'<'} Geri</Text>
        </TouchableOpacity>
        <Text style={styles.title}>
          {id === 'lesen' ? '📖 Okuma' : id === 'hoeren' ? '🎧 Dinleme' : id === 'grammatik' ? '📝 Dilbilgisi' : '✍️ Yazma'}
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {error ? (
          <View style={{ alignItems: 'center', marginTop: 20 }}>
            <Text style={{ color: Colors.error, marginBottom: 10 }}>Egzersiz yüklenirken bir hata oluştu.</Text>
            <TouchableOpacity onPress={() => router.back()} style={styles.primaryBtn}>
              <Text style={styles.primaryBtnText}>Geri Dön</Text>
            </TouchableOpacity>
          </View>
        ) : data ? (
          <View style={styles.contentCard}>
            {id === 'lesen' && renderLesen()}
            {id === 'grammatik' && renderGrammatik()}
            {id === 'hoeren' && renderHoeren()}
            {id === 'schreiben' && renderSchreiben()}
          </View>
        ) : (
          <Text style={{ color: Colors.error }}>Veri bulunamadı.</Text>
        )}
      </ScrollView>

      {/* Word Selection Analyze Bar — appears when long-pressing a word */}
      {selectedWord && (
        <Animated.View
          style={[
            styles.wordBar,
            {
              opacity: analyzeBarAnim,
              transform: [
                { translateY: analyzeBarAnim.interpolate({ inputRange: [0, 1], outputRange: [30, 0] }) },
              ],
            },
          ]}
        >
          <View style={styles.wordBarInner}>
            <Text style={styles.wordBarText}>"{selectedWord}"</Text>
            <TouchableOpacity style={styles.wordBarBtn} onPress={handleAnalyzeSelectedWord}>
              <Text style={styles.wordBarBtnText}>🤖 Analiz Et</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.wordBarClose} onPress={handleDismissWordBar}>
              <Text style={{ color: Colors.textMuted, fontSize: 16 }}>✕</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      )}

      {/* Word Analysis Modal */}
      <Modal visible={analysisModalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
              <Text style={styles.contentTitle}>🤖 Kelime Analizi</Text>
              <TouchableOpacity onPress={() => { setAnalysisModalVisible(false); setAnalysisResult(null); }}>
                <Text style={{ color: Colors.textMuted, fontSize: 22 }}>✕</Text>
              </TouchableOpacity>
            </View>
            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 15 }}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="Almanca bir kelime yazın..."
                placeholderTextColor={Colors.textMuted}
                value={analysisWord}
                onChangeText={setAnalysisWord}
                autoCapitalize="none"
              />
              <TouchableOpacity
                style={[styles.primaryBtn, { paddingHorizontal: 16 }]}
                onPress={handleAnalyzeWord}
                disabled={analysisLoading}
              >
                {analysisLoading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.primaryBtnText}>Ara</Text>
                )}
              </TouchableOpacity>
            </View>

            {analysisLoading && !analysisResult && (
              <View style={{ alignItems: 'center', padding: 20 }}>
                <ActivityIndicator color={Colors.accent} size="large" />
                <Text style={{ color: Colors.textMuted, marginTop: 10 }}>Analiz ediliyor...</Text>
              </View>
            )}

            {analysisResult && (
              <ScrollView style={{ maxHeight: 400 }} showsVerticalScrollIndicator={false}>
                <View style={styles.analysisCard}>
                  <Text style={styles.analysisWordTitle}>{analysisResult.word || analysisWord}</Text>
                  <View style={styles.analysisTypeBadge}>
                    <Text style={styles.analysisTypeBadgeText}>{analysisResult.type || '?'}</Text>
                  </View>

                  {analysisResult.artikel && (
                    <View style={styles.analysisRow}>
                      <Text style={styles.analysisLabel}>Artikel</Text>
                      <Text style={styles.analysisValue}>{analysisResult.artikel}</Text>
                    </View>
                  )}
                  {analysisResult.plural && (
                    <View style={styles.analysisRow}>
                      <Text style={styles.analysisLabel}>Çoğul</Text>
                      <Text style={styles.analysisValue}>{analysisResult.plural}</Text>
                    </View>
                  )}
                  {analysisResult.turkce && (
                    <View style={styles.analysisRow}>
                      <Text style={styles.analysisLabel}>Türkçe</Text>
                      <Text style={styles.analysisValue}>{analysisResult.turkce}</Text>
                    </View>
                  )}
                  {analysisResult.ingilizce && (
                    <View style={styles.analysisRow}>
                      <Text style={styles.analysisLabel}>İngilizce</Text>
                      <Text style={styles.analysisValue}>{analysisResult.ingilizce}</Text>
                    </View>
                  )}

                  {/* Verb conjugation */}
                  {analysisResult.conjugation && (
                    <View style={{ marginTop: 12 }}>
                      <Text style={[styles.analysisLabel, { marginBottom: 6 }]}>Çekim</Text>
                      {Object.entries(analysisResult.conjugation).map(([person, form]: [string, any]) => (
                        <View key={person} style={styles.conjRow}>
                          <Text style={styles.conjPerson}>{person}</Text>
                          <Text style={styles.conjForm}>{form}</Text>
                        </View>
                      ))}
                    </View>
                  )}

                  {/* Komparativ/Superlativ */}
                  {analysisResult.komparativ && (
                    <View style={styles.analysisRow}>
                      <Text style={styles.analysisLabel}>Komparativ</Text>
                      <Text style={styles.analysisValue}>{analysisResult.komparativ}</Text>
                    </View>
                  )}
                  {analysisResult.superlativ && (
                    <View style={styles.analysisRow}>
                      <Text style={styles.analysisLabel}>Superlativ</Text>
                      <Text style={styles.analysisValue}>{analysisResult.superlativ}</Text>
                    </View>
                  )}

                  {/* Beispiele */}
                  {(analysisResult['örnek_cümleler'] || analysisResult.beispiele || []).length > 0 && (
                    <View style={{ marginTop: 12 }}>
                      <Text style={[styles.analysisLabel, { marginBottom: 6 }]}>Örnekler</Text>
                      {(analysisResult['örnek_cümleler'] || analysisResult.beispiele).map((ex: any, i: number) => (
                        <View key={i} style={styles.exampleBox}>
                          <Text style={styles.exampleSentence}>{ex.sentence || ex.satz}</Text>
                          <Text style={styles.exampleTranslation}>{ex.translation || ex.uebersetzung}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.cardBorder,
  },
  backBtn: { paddingRight: 16 },
  backBtnText: { color: Colors.primary, fontSize: 16, fontWeight: 'bold' },
  title: { fontSize: 20, fontWeight: 'bold', color: Colors.text },
  scroll: { padding: 20, paddingBottom: 120 },
  contentCard: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    marginBottom: 20,
  },
  contentTitle: { fontSize: 22, fontWeight: 'bold', color: Colors.text, marginBottom: 10 },
  bodyText: { fontSize: 16, color: Colors.text, lineHeight: 26 },
  wordHighlighted: {
    backgroundColor: 'rgba(138,43,226,0.35)',
    color: Colors.accent,
    borderRadius: 4,
  },
  questionBlock: {
    marginTop: 20,
    backgroundColor: 'rgba(255,255,255,0.02)',
    padding: 15,
    borderRadius: 12,
  },
  questionText: { fontSize: 16, color: Colors.text, fontWeight: 'bold', marginBottom: 10 },
  optionBtn: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    padding: 15,
    borderRadius: 10,
    marginBottom: 8,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  optionBtnSelected: {
    backgroundColor: 'rgba(138,43,226,0.2)',
    borderColor: Colors.primary,
  },
  optionBtnCorrect: {
    backgroundColor: 'rgba(16,185,129,0.2)',
    borderColor: Colors.success,
  },
  optionBtnWrong: {
    backgroundColor: 'rgba(239,68,68,0.2)',
    borderColor: Colors.error,
  },
  optionText: { color: Colors.text, fontSize: 16 },
  rfBtn: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  bulletText: { color: Colors.text, fontSize: 16, marginBottom: 6, lineHeight: 24 },
  textArea: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    color: Colors.text,
    padding: 15,
    borderRadius: 12,
    minHeight: 150,
    textAlignVertical: 'top',
    marginTop: 15,
    marginBottom: 10,
    fontSize: 16,
    lineHeight: 24,
  },
  wordCount: {
    color: Colors.textMuted,
    fontSize: 13,
    textAlign: 'right',
    marginBottom: 12,
  },
  primaryBtn: {
    backgroundColor: Colors.primary,
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
  },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  contextBadge: {
    color: Colors.accent,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  explanationBox: {
    marginTop: 10,
    padding: 12,
    backgroundColor: 'rgba(59,130,246,0.08)',
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#3b82f6',
  },
  explanationLabel: { color: '#3b82f6', fontWeight: 'bold', fontSize: 14, marginBottom: 4 },
  explanationText: { color: Colors.text, fontSize: 14, lineHeight: 20 },
  scoreCard: {
    marginTop: 20,
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  scoreText: { fontSize: 22, fontWeight: 'bold' },
  tipsBox: {
    backgroundColor: 'rgba(234,179,8,0.08)',
    padding: 12,
    borderRadius: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#eab308',
  },
  tipsTitle: { color: '#eab308', fontWeight: 'bold', fontSize: 15, marginBottom: 6 },
  tipsText: { color: Colors.text, fontSize: 14, marginBottom: 3 },
  evalCard: {
    backgroundColor: 'rgba(138,43,226,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(138,43,226,0.2)',
    borderRadius: 16,
    padding: 20,
  },
  scoreRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 10,
  },
  scoreItem: { alignItems: 'center' },
  scoreNumber: { fontSize: 28, fontWeight: 'bold' },
  scoreLabel: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  errorItem: {
    marginTop: 10,
    backgroundColor: 'rgba(239,68,68,0.08)',
    padding: 12,
    borderRadius: 10,
    borderLeftWidth: 3,
    borderLeftColor: Colors.error,
  },
  errorBadge: {
    backgroundColor: 'rgba(239,68,68,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginBottom: 6,
  },
  errorBadgeText: { color: Colors.error, fontSize: 11, fontWeight: 'bold' },
  errorOriginal: { color: Colors.error, textDecorationLine: 'line-through', fontSize: 15, marginBottom: 2 },
  errorCorrection: { color: Colors.success, fontWeight: 'bold', fontSize: 15, marginBottom: 6 },
  errorExplanation: { color: Colors.text, fontSize: 14, lineHeight: 20 },
  improvedTextBox: {
    backgroundColor: 'rgba(16,185,129,0.06)',
    padding: 12,
    borderRadius: 10,
    borderLeftWidth: 3,
    borderLeftColor: Colors.success,
  },

  // Word selection bar (bottom)
  wordBar: {
    position: 'absolute',
    bottom: 80,
    left: 16,
    right: 16,
    zIndex: 100,
  },
  wordBarInner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(26,26,46,0.97)',
    borderWidth: 1,
    borderColor: 'rgba(0,240,255,0.3)',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 10,
  },
  wordBarText: {
    color: Colors.accent,
    fontWeight: 'bold',
    fontSize: 17,
    flex: 1,
  },
  wordBarBtn: {
    backgroundColor: Colors.accent,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 22,
  },
  wordBarBtnText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 14,
  },
  wordBarClose: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: Colors.card,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    maxHeight: '85%',
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    color: Colors.text,
    padding: 14,
    borderRadius: 12,
    fontSize: 16,
  },

  // Analysis card
  analysisCard: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 12,
    padding: 16,
  },
  analysisWordTitle: {
    color: Colors.accent,
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  analysisTypeBadge: {
    backgroundColor: 'rgba(138,43,226,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  analysisTypeBadgeText: { color: Colors.primary, fontSize: 12, fontWeight: 'bold' },
  analysisRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  analysisLabel: { color: Colors.textMuted, fontSize: 14 },
  analysisValue: { color: Colors.text, fontSize: 14, fontWeight: '600' },
  conjRow: {
    flexDirection: 'row',
    paddingVertical: 4,
  },
  conjPerson: { color: Colors.textMuted, width: 80, fontSize: 14 },
  conjForm: { color: Colors.text, fontSize: 14, fontWeight: '600' },
  exampleBox: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    padding: 10,
    borderRadius: 8,
    marginBottom: 8,
  },
  exampleSentence: { color: Colors.text, fontSize: 14 },
  exampleTranslation: { color: Colors.textMuted, fontSize: 12, marginTop: 2 },

  // Navigation buttons after check
  navButtonsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  navBtnPrimary: {
    flex: 1,
    backgroundColor: Colors.primary,
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
  },
  navBtnSecondary: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  navBtnSecondaryText: {
    color: Colors.textMuted,
    fontSize: 15,
    fontWeight: '600',
  },

  // Text input for open-ended questions (Hören text type)
  textInputAnswer: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    color: Colors.text,
    padding: 14,
    borderRadius: 10,
    marginTop: 8,
    fontSize: 16,
    minHeight: 50,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },

  // Grammatik sub-module styles
  tabContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  tabBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  tabBtnActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  tabBtnText: {
    color: Colors.textMuted,
    fontWeight: '600',
    fontSize: 14,
  },
  tabBtnTextActive: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
  verbHeader: {
    color: Colors.textMuted,
    fontSize: 14,
    marginBottom: 8,
  },
  satzSlotsCard: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 12,
    padding: 14,
    minHeight: 60,
    borderWidth: 1.5,
    borderColor: 'rgba(138,43,226,0.3)',
    justifyContent: 'center',
  },
  chipSelected: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  chipSelectedText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 15,
  },
  chipBank: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  chipBankUsed: {
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderColor: 'transparent',
  },
  chipBankText: {
    color: Colors.text,
    fontSize: 15,
  },
  chipCorrect: {
    backgroundColor: 'rgba(16,185,129,0.3)',
    borderColor: Colors.success,
  },
  chipWrong: {
    backgroundColor: 'rgba(239,68,68,0.3)',
    borderColor: Colors.error,
  },
  resetBtn: {
    alignSelf: 'flex-end',
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  resetBtnText: {
    color: Colors.textMuted,
    fontSize: 13,
  },
  wordBankContainer: {
    backgroundColor: 'rgba(234,179,8,0.08)',
    padding: 12,
    borderRadius: 10,
    marginBottom: 14,
    borderLeftWidth: 3,
    borderLeftColor: '#eab308',
  },
  wordBankTitle: {
    color: '#eab308',
    fontSize: 13,
    fontWeight: 'bold',
  },
  wordBankBadge: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  wordBankBadgeText: {
    color: Colors.text,
    fontSize: 13,
    fontWeight: '600',
  },
  textLueckeCard: {
    backgroundColor: 'rgba(255,255,255,0.02)',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  inlineInput: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    color: Colors.accent,
    fontWeight: 'bold',
    fontSize: 15,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Colors.accent,
    minWidth: 65,
    textAlign: 'center',
    marginHorizontal: 4,
    marginVertical: 2,
  },
  inlineInputCorrect: {
    backgroundColor: 'rgba(16,185,129,0.2)',
    borderColor: Colors.success,
    color: Colors.success,
  },
  inlineInputWrong: {
    backgroundColor: 'rgba(239,68,68,0.2)',
    borderColor: Colors.error,
    color: Colors.error,
  },
});
