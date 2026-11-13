const APP_NAME = 'Sohoj Kaj';

const MODEL_URL =
  'https://github.com/khalidfarhanfarlu/shobdo-releases/releases/download/models-v1/bangla-whisper-medium-Q8_0.gguf';
const MODEL_NAME = 'bangla-whisper-medium-Q8_0.gguf';
const MODEL_SIZE_BYTES = 831185376;

const GEMINI_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models';

const LANGUAGES = {
  bn: {
    code: 'bn',
    label: 'বাংলা',
    labelEn: 'Bangla',
    whisperLang: 'bn',
    whisperPrompt: 'এটি বাংলা ভাষার কথা। বাংলা লিপিতে লেখো।'
  },
  en: {
    code: 'en',
    label: 'English',
    labelEn: 'English',
    whisperLang: 'en',
    whisperPrompt: ''
  }
};

const DEFAULTS = {
  mode: 'offline',
  geminiKey: '',
  geminiModel: 'gemini-2.5-flash',
  banglaShortcut: 'Alt+Shift+B',
  englishShortcut: 'Alt+Shift+E',
  silenceStopMs: 1800,
  maxSeconds: 60,
  autoPaste: true,
  modelPath: ''
};

module.exports = { APP_NAME, MODEL_URL, MODEL_NAME, MODEL_SIZE_BYTES, GEMINI_ENDPOINT, LANGUAGES, DEFAULTS };
