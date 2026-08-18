import os
import glob
import json
import whisper
from mutagen.mp3 import MP3

def main():
    print("Loading Whisper model (base)...")
    model = whisper.load_model("base")
    
    mp3_files = []
    for teil in ['beg_a1_teil1', 'beg_a1_teil2']:
        folder = os.path.join('HÖREN', teil)
        files = glob.glob(os.path.join(folder, '*.mp3'))
        mp3_files.extend(files)
        
    mp3_files.sort() # Ensure consistent order
    
    long_files = []
    for f in mp3_files:
        try:
            audio = MP3(f)
            duration = audio.info.length
            if duration > 60.0:
                long_files.append((f, duration))
        except Exception as e:
            pass
            
    # Skip the first 3 that we already tested and failed
    batch_files = long_files[3:23] # Next 20 files
    print(f"Processing {len(batch_files)} files...")
    
    results = []
    for i, (f, duration) in enumerate(batch_files):
        print(f"Transcribing {i+1}/{len(batch_files)}: {f} ({duration:.1f}s)")
        try:
            result = model.transcribe(f, language="de")
            text = result["text"].strip()
            
            if len(text.split()) > 20: # Basic filter
                results.append({
                    "id": f"beg_a1_t{i+4}",
                    "kapitel": None,
                    "aufgabe": None,
                    "titel": f"Begegnungen Hörübung {i+4}",
                    "typ": "nur_horen",
                    "audio_file": os.path.basename(f),
                    "audio_cd": None,
                    "audio_track": None,
                    "duration_sec": duration,
                    "text": text,
                    "fragen": []
                })
        except Exception as e:
            print(f"Error: {e}")
            
    out_path = os.path.join('data', 'begegnungen_transcripts_batch.json')
    with open(out_path, 'w', encoding='utf-8') as out_file:
        json.dump(results, out_file, indent=2, ensure_ascii=False)
        
    print(f"Saved {len(results)} transcripts to {out_path}")

if __name__ == "__main__":
    main()
