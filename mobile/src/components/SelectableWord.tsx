import React, { useState, useCallback, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Dimensions } from 'react-native';
import { Colors } from '../constants/Colors';

interface SelectableWordProps {
  text: string;
  onAnalyze: (word: string) => void;
  style?: any;
}

/**
 * Metni kelimelerine böler, her kelimeye long-press yapılınca
 * üzerinde "Analiz Et" tooltip'i belirir.
 * Web versiyonundaki selectionchange → tooltip davranışının RN karşılığı.
 */
export function SelectableWord({ text, onAnalyze, style }: SelectableWordProps) {
  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const wordRefs = useRef<Record<string, View | null>>({});

  const showTooltip = useCallback((word: string, ref: View | null) => {
    if (!ref) return;
    ref.measureInWindow((x, y, width, height) => {
      setTooltipPos({
        x: x + width / 2,
        y: y,
      });
      setSelectedWord(word);
      fadeAnim.setValue(0);
      Animated.spring(fadeAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      }).start();
    });
  }, [fadeAnim]);

  const hideTooltip = useCallback(() => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true,
    }).start(() => setSelectedWord(null));
  }, [fadeAnim]);

  const handleAnalyze = useCallback(() => {
    if (selectedWord) {
      // Sadece harflerden oluşan kelimeyi temizle
      const cleanWord = selectedWord.replace(/[^a-zA-ZäöüßÄÖÜ]/g, '');
      if (cleanWord.length > 1) {
        onAnalyze(cleanWord);
      }
      hideTooltip();
    }
  }, [selectedWord, onAnalyze, hideTooltip]);

  // Metni satırlara, ardından kelimelere böl
  const lines = text.split('\n');

  return (
    <View style={style}>
      {lines.map((line, lineIdx) => (
        <Text key={lineIdx} style={styles.lineText}>
          {line.split(/(\s+)/).map((segment, segIdx) => {
            const isWord = /\S/.test(segment);
            if (!isWord) {
              return <Text key={`${lineIdx}-${segIdx}`}>{segment}</Text>;
            }
            const key = `${lineIdx}-${segIdx}`;
            return (
              <Text
                key={key}
                ref={(r) => { wordRefs.current[key] = r as any; }}
                onLongPress={() => showTooltip(segment, wordRefs.current[key])}
                onPress={() => {
                  if (selectedWord) hideTooltip();
                }}
                style={[
                  styles.word,
                  selectedWord === segment && styles.wordHighlighted,
                ]}
                suppressHighlighting={false}
              >
                {segment}
              </Text>
            );
          })}
          {lineIdx < lines.length - 1 ? '\n' : ''}
        </Text>
      ))}

      {/* Tooltip */}
      {selectedWord && (
        <Animated.View
          style={[
            styles.tooltipContainer,
            {
              opacity: fadeAnim,
              transform: [
                { scale: fadeAnim.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1] }) },
                { translateY: fadeAnim.interpolate({ inputRange: [0, 1], outputRange: [5, 0] }) },
              ],
            },
          ]}
          pointerEvents="box-none"
        >
          <View style={styles.tooltipOverlay}>
            <TouchableOpacity
              style={styles.tooltipBtn}
              onPress={handleAnalyze}
              activeOpacity={0.7}
            >
              <Text style={styles.tooltipBtnText}>🤖 Analiz Et</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.tooltipCloseBtn}
              onPress={hideTooltip}
            >
              <Text style={styles.tooltipCloseBtnText}>✕</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      )}
    </View>
  );
}

/**
 * Daha basit versiyon: Tüm metni selectable yapıp,
 * ayrı bir "Analiz Et" butonu ile seçilen kelimeyi alır.
 * Bu, SelectableWord ile birlikte veya yerine kullanılabilir.
 */
export function AnalyzableText({ text, onAnalyze, style }: SelectableWordProps) {
  const [pressedWord, setPressedWord] = useState<string | null>(null);
  const [showAnalyzeBar, setShowAnalyzeBar] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const words = text.split(/(\s+)/);

  const handleWordPress = (word: string) => {
    const clean = word.replace(/[^a-zA-ZäöüßÄÖÜ]/g, '');
    if (clean.length <= 1) return;

    setPressedWord(clean);
    setShowAnalyzeBar(true);
    fadeAnim.setValue(0);
    Animated.spring(fadeAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 120,
      friction: 8,
    }).start();
  };

  const handleDismiss = () => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true,
    }).start(() => {
      setShowAnalyzeBar(false);
      setPressedWord(null);
    });
  };

  const handleAnalyze = () => {
    if (pressedWord) {
      onAnalyze(pressedWord);
      handleDismiss();
    }
  };

  return (
    <View style={style}>
      <Text style={styles.bodyText}>
        {words.map((segment, idx) => {
          const isWord = /\S/.test(segment);
          if (!isWord) return <Text key={idx}>{segment}</Text>;
          
          const clean = segment.replace(/[^a-zA-ZäöüßÄÖÜ]/g, '');
          const isSelected = pressedWord === clean && clean.length > 1;
          
          return (
            <Text
              key={idx}
              onLongPress={() => handleWordPress(segment)}
              style={isSelected ? styles.wordHighlighted : undefined}
            >
              {segment}
            </Text>
          );
        })}
      </Text>

      {/* Bottom analyze bar */}
      {showAnalyzeBar && pressedWord && (
        <Animated.View
          style={[
            styles.analyzeBar,
            {
              opacity: fadeAnim,
              transform: [
                { translateY: fadeAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) },
              ],
            },
          ]}
        >
          <View style={styles.analyzeBarInner}>
            <Text style={styles.analyzeBarWord}>"{pressedWord}"</Text>
            <TouchableOpacity style={styles.analyzeBarBtn} onPress={handleAnalyze}>
              <Text style={styles.analyzeBarBtnText}>🤖 Analiz Et</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.analyzeBarClose} onPress={handleDismiss}>
              <Text style={styles.tooltipCloseBtnText}>✕</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  lineText: {
    fontSize: 16,
    color: Colors.text,
    lineHeight: 26,
  },
  bodyText: {
    fontSize: 16,
    color: Colors.text,
    lineHeight: 26,
  },
  word: {
    // Words are inline by default
  },
  wordHighlighted: {
    backgroundColor: 'rgba(138,43,226,0.3)',
    borderRadius: 4,
    color: Colors.accent,
  },
  tooltipContainer: {
    position: 'absolute',
    top: -50,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 999,
  },
  tooltipOverlay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  tooltipBtn: {
    backgroundColor: Colors.accent,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  tooltipBtnText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 14,
  },
  tooltipCloseBtn: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tooltipCloseBtnText: {
    color: Colors.textMuted,
    fontSize: 14,
  },
  analyzeBar: {
    marginTop: 12,
    borderRadius: 12,
    overflow: 'hidden',
  },
  analyzeBarInner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(138,43,226,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(138,43,226,0.3)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 10,
  },
  analyzeBarWord: {
    color: Colors.accent,
    fontWeight: 'bold',
    fontSize: 16,
    flex: 1,
  },
  analyzeBarBtn: {
    backgroundColor: Colors.accent,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  analyzeBarBtnText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 13,
  },
  analyzeBarClose: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
