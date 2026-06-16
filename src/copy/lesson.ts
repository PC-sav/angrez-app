// All in-lesson learner-facing strings — Hindi (Devanagari), warm, non-shaming.
// Never expose English developer strings to learners.

export const LESSON = {
  teach: {
    phrasePrompt:    'अब आप इसे ज़ोर से बोलें!',
    exchangePrompt:  'सुनें और ध्यान दें...',
    continueButton:  'आगे',
    audioButton:     '🔊 सुनें',
  },

  speech: {
    micHint:         'आवाज़ सुनाई दें — बोलिए!',
    listening:       'सुन रहा हूं...',
    processing:      'सोच रहा हूं...',
    heard:           (t: string) => `मैंने सुना: "${t}"`,
    correct:         'शाबाश! आपने अच्छा बोला!',
    incorrect:       'कोई बात नहीं! एक बार और कोशिश करें?',
    silent:          'अरे, कुछ बोलिए ना — कोशिश करें!',
    suggestFallback: 'माइक नहीं चल रहा? लिखकर भेजें।',
    saved:           'उत्तर सुरक्षित है — आगे बढ़ें!',
    voiceBonus:      (n: number) => `+${n} बोनस अंक — बोलने के लिए!`,
    micButton:       '🎤',
    micButtonStop:   '⏹',
  },

  puzzle: {
    progress:        (current: number, total: number) => `${current} / ${total}`,
    nextButton:      'आगे बढ़ें',
    retryButton:     'फिर कोशिश करें',
    textPlaceholder: 'यहाँ लिखें...',
    submitButton:    'भेजें',
    tapFallbackHint: 'एक विकल्प चुनें:',
  },

  completion: {
    passed:          (title: string) => `शाबाश! आपने "${title}" पूरा किया!`,
    notPassed:       'अभी और अभ्यास करें — आप कर सकते हैं!',
    masteryLabel:    (pct: number) => `${pct}% महारत`,
    pointsLabel:     (n: number) => `+${n} अंक मिले!`,
    returnButton:    'घर वापस जाएं',
  },
} as const;
