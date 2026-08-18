# DeutschFit (Language Learning Platform)

DeutschFit is an AI-powered German language learning and assessment platform. It includes modules for vocabulary, verb conjugations, reading/writing analysis, and listening exercises.

## 🚀 Features
- **Vocabulary Module**: Intelligent word search, conjugation lookup, and example sentences.
- **Writing Analysis**: Evaluates German texts written by the user and provides AI-driven feedback.
- **Verb Conjugation Exercises**: Fill-in-the-blank style verb exercises.
- **Mobile Integration**: Expo-based mobile app frontend.
- **AI Integration**: Uses advanced language models (Gemini) for text evaluation and analysis.

## ⚠️ Data & Copyright Notice

> [!WARNING]  
> **The original datasets, textbooks, and PDF/audio files used in this project are copyrighted material and have been explicitly excluded from this repository.** 

To demonstrate the application's functionality without violating copyright laws, a set of **mock/dummy data** is provided in the `sample_data/` directory.

### Generating Your Own Data
If you want to use this application with your own German textbooks, you can automatically extract texts and generate TELC-format questions using our custom data pipeline. 
Please refer to the [AI Data Pipeline Workflow](AI_Data_Pipeline_Workflow.md) document for detailed technical instructions on how to use AI to mine data from PDFs.

### How to run with your own data:
If you want to run this application locally, you will need to provide your own JSON/Database files in the root directory or update the Python scripts to point to the `sample_data/` files.

1. Create a `woerter_db.json` file in the root directory (you can use `sample_data/woerter_db_sample.json` as a template).
2. Create a `clean_verb_blocks.json` file in the root directory (use `sample_data/clean_verb_blocks_sample.json` as a template).
3. Audio, PDF, and SQLite database files (`data/deutschfit.db`) should be generated or provided manually.

## 🛠️ Tech Stack
- **Backend**: Python (FastAPI/Flask/Native Scripts)
- **Frontend/Mobile**: React Native / Expo
- **AI**: Google Gemini API

## ⚙️ Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/deutschfit.git
   cd deutschfit
   ```

2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   # and for mobile:
   cd mobile
   npm install
   ```

3. Setup environment variables:
   Create a `.env` file in the root directory and add your API keys:
   ```env
   GEMINI_API_KEY=your_api_key_here
   ```

4. Run the server:
   ```bash
   python server.py
   ```
