import re
import spacy
from spacy.morphology import Morphology
import unicodedata
from . import goethe_levels as levels

try:
    nlp = spacy.load('de_core_news_sm')
except OSError:
    print("Warning: SpaCy model 'de_core_news_sm' not found. Please install it.")
    nlp = None

# A1/A2 için Konjunktiv II istemiyoruz
def subjunctive_analysis(input_doc, level):
    if level == 'b1':
        return [] # B1'de konjunktiv serbest
    subj_words = [token.text for token in input_doc if "Mood=Sub" in token.morph]
    return subj_words

def punctuation_analysis(input_doc):
    easy_punct = ['.', ',', '?', '!', ':']
    punctuation_highlights = []
    for token in input_doc:
        if token.pos_ == "PUNCT" and token.text not in easy_punct:
            punctuation_highlights.append(token.text)
    return punctuation_highlights

def numbers_analysis(input_doc):
    num_highlights = []
    for token in input_doc:
        if token.pos_ == "NUM" and not token.shape_.startswith('d'):
            num_highlights.append(token.text)
    return num_highlights

def language_level_analysis(input_doc, level):
    lvl = level.lower()
    if lvl == 'a1':
        level_words = {w.lower() for w in levels.a1}
    elif lvl == 'a2':
        level_words = {w.lower() for w in list(levels.a1) + list(levels.a2)}
    elif lvl == 'b1':
        level_words = {w.lower() for w in list(levels.a1) + list(levels.a2) + list(levels.b1)}
    else:
        level_words = {w.lower() for w in levels.a1}

    # Noktalama değil, stop-word değilse ve isim/fiil falansa bak
    word_list = []
    for token in input_doc:
        if not token.is_punct and not token.is_stop:
            # küçük harfe çevirerek veya lemma ile
            lemma = token.lemma_.lower()
            if lemma not in level_words:
                word_list.append(token.text)
    return word_list

def word_count_analysis(input_doc, min_words):
    words = [token.text for token in input_doc if not token.is_punct]
    return len(words)

def deduplicate_list(to_dedup):
    return list(set(to_dedup))

def check_text(text_input, level, min_words=50):
    if not text_input:
        text_input = ""
    normalized_text = unicodedata.normalize('NFC', text_input).replace(u'\xa0', u' ')
    
    if nlp is None:
        empty_checks = {'level_ok': True, 'punctuation_ok': True, 'numbers_ok': True, 'subjunctive_ok': True, 'word_count_ok': True, 'current_word_count': 0, 'min_words': min_words}
        empty_hl = {'level_warnings': [], 'punctuation_warnings': [], 'number_warnings': [], 'subjunctive_warnings': []}
        return empty_checks, empty_hl
        
    doc = nlp(normalized_text.replace("\n", " "))
    
    goethe_highlights = language_level_analysis(doc, level)
    punctuation_highlights = punctuation_analysis(doc)
    num_highlights = numbers_analysis(doc)
    subjunctive_highlights = subjunctive_analysis(doc, level)
    current_word_count = word_count_analysis(doc, min_words)
    
    checks = {
        'level_ok': len(goethe_highlights) == 0,
        'punctuation_ok': len(punctuation_highlights) == 0,
        'numbers_ok': len(num_highlights) == 0,
        'subjunctive_ok': len(subjunctive_highlights) == 0,
        'word_count_ok': current_word_count >= min_words,
        'current_word_count': current_word_count,
        'min_words': min_words
    }
    
    highlights = {
        'level_warnings': deduplicate_list(goethe_highlights),
        'punctuation_warnings': deduplicate_list(punctuation_highlights),
        'number_warnings': deduplicate_list(num_highlights),
        'subjunctive_warnings': deduplicate_list(subjunctive_highlights)
    }
    
    return checks, highlights
