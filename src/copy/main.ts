// All learner-facing strings for Ghar / Safar / Profile — Hindi (Devanagari).
// Sweep this file for Hindi review before shipping.

export const MAIN = {
  ghar: {
    greeting:      (name: string | null) => name ? `नमस्ते, ${name}!` : 'नमस्ते!',
    startButton:   'शुरू करें',
    statusMap: {
      not_started: 'शुरू नहीं हुआ',
      in_progress:  'जारी है',
      complete:     'पूरा हुआ',
    } as Record<string, string>,
    statusFallback: 'जारी है',
    downloadProgress: (pct: number) => `पाठ तैयार हो रहा है… ${pct}%`,
    downloadDone:  'पाठ तैयार है ✓',
    loading:       'लोड हो रहा है…',
    errorNoCache:  'नेटवर्क नहीं मिला — बाद में कोशिश करें',
    masteryLabel:  (score: number) => `${Math.round(score * 100)}% महारत`,
  },

  safar: {
    lockedLabel:  (id: string) => `सब-स्टेज ${id}`,
    lockedToast:  'अभी लॉक है — पहले पिछला सब-स्टेज पूरा करें',
    currentBadge: 'अभी यहाँ',
    doneBadge:    '✓',
  },

  profile: {
    greeting:           (name: string | null) => name ? `नमस्ते, ${name}!` : 'नमस्ते!',
    walletTitle:        'आपका बटुआ',
    walletBalance:      (bal: number) => `₹${bal}`,
    referralTitle:      'दोस्तों को बुलाएँ',
    referralCode:       (code: string) => `आपका कोड: ${code}`,
    whatsappShare:      'WhatsApp पर शेयर करें',
    // TODO: replace [App link coming soon] with Play Store / App Store URL at launch
    whatsappMessage:    (code: string) =>
      `Angrez के साथ अंग्रेज़ी सीखें! मेरा referral code है: ${code}\n\n[App link coming soon]`,
    subStagesCompleted: (n: number) => `अब तक पूरे किए: ${n} सब-स्टेज`,
    version:            (v: string) => `Version ${v}`,
  },
} as const;
