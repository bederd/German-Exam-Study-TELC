import AsyncStorage from '@react-native-async-storage/async-storage';

export interface Word {
  word: string;
  type: string;
  meaning: string;
  article?: string;
  plural?: string;
  example?: string;
  last_updated?: string;
}

const WORDS_KEY = '@deutschfit_words';

export const WordsService = {
  async getWords(): Promise<Word[]> {
    try {
      const jsonValue = await AsyncStorage.getItem(WORDS_KEY);
      return jsonValue != null ? JSON.parse(jsonValue) : [];
    } catch (e) {
      console.error('Error loading words:', e);
      return [];
    }
  },

  async saveWord(newWord: Word) {
    try {
      const currentWords = await this.getWords();
      
      const wordText = (newWord.word || '').toLowerCase();
      const wtype = newWord.type || '';
      
      const existingIdx = currentWords.findIndex(
        w => w.word.toLowerCase() === wordText && w.type === wtype
      );
      
      newWord.last_updated = new Date().toISOString();
      
      if (existingIdx >= 0) {
        currentWords[existingIdx] = newWord;
      } else {
        currentWords.push(newWord);
      }
      
      await AsyncStorage.setItem(WORDS_KEY, JSON.stringify(currentWords));
      return { success: true, word: newWord };
    } catch (e: any) {
      return { error: e.message };
    }
  },

  async deleteWord(wordText: string, type: string) {
    try {
      const currentWords = await this.getWords();
      const filtered = currentWords.filter(
        w => !(w.word.toLowerCase() === wordText.toLowerCase() && w.type === type)
      );
      await AsyncStorage.setItem(WORDS_KEY, JSON.stringify(filtered));
      return { success: true };
    } catch (e: any) {
      return { error: e.message };
    }
  }
};
