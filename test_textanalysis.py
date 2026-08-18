import sys
import os
sys.path.append(os.path.dirname(__file__))

from checker.textanalysis import check_text

text = "Hallo! Ich gehe heute in die Schule. Wahrscheinlichkeit ist sehr hoch, dass es regnet."
print("Testing with A1 level:")
checks, highlights = check_text(text, level='a1', min_words=10)
print("Checks:", checks)
print("Highlights:", highlights)
