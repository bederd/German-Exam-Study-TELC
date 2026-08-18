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
        
    print(f"Found {len(mp3_files)} MP3 files.")
    
    long_files = []
    for f in mp3_files:
        try:
            audio = MP3(f)
            duration = audio.info.length
            if duration > 60.0:
                long_files.append((f, duration))
        except Exception as e:
            print(f"Error reading {f}: {e}")
            
    print(f"Found {len(long_files)} files > 60 seconds.")
    
    # Process only the first 3 for now to demonstrate the pipeline to the user quickly
    # (Since local whisper can take some time per file)
    long_files = long_files[:3] 
    
    results = []
    for i, (f, duration) in enumerate(long_files):
        print(f"Transcribing {i+1}/{len(long_files)}: {f} ({duration:.1f}s)")
        try:
            # Setting language to German
            result = model.transcribe(f, language="de")
            text = result["text"].strip()
            
            # Simple heuristic to check if it's a valid text
            if len(text.split()) > 15:
                results.append({
                    "id": f"beg_a1_t{i+1}",
                    "kapitel": None,
                    "aufgabe": None,
                    "titel": f"Begegnungen Hörübung {i+1}",
                    "typ": "nur_horen",
                    "audio_file": os.path.basename(f),
                    "audio_cd": None,
                    "audio_track": None,
                    "duration_sec": duration,
                    "text": text,
                    "fragen": []
                })
        except Exception as e:
            print(f"Error transcribing {f}: {e}")
            
    os.makedirs('data', exist_ok=True)
    out_path = os.path.join('data', 'begegnungen_transcripts.json')
    with open(out_path, 'w', encoding='utf-8') as out_file:
        json.dump(results, out_file, indent=2, ensure_ascii=False)
        
    print(f"Saved {len(results)} transcripts to {out_path}")

if __name__ == "__main__":
    main()
