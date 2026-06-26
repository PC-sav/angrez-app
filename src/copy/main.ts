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

  paywall: {
    title:        'आज की पढ़ाई पूरी!',
    subtitle:     'मुफ़्त में 1 सब-स्टेज प्रतिदिन',
    resetLabel:   (time: string) => `कल ${time} से फिर उपलब्ध`,
    unlockTitle:  'अनलिमिटेड सीखें',
    planNames:    { year: 'सालाना', month: 'मासिक', trial: '7 दिन' } as Record<string, string>,
    planDuration: { year: '/साल', month: '/माह', trial: '7 दिनों के लिए' } as Record<string, string>,
    bestValue:    'सबसे किफ़ायती',
    campaign:     (name: string) => `${name} ऑफ़र`,
    ctaButton:      'अभी लें',
    stubNotice:     'भुगतान जल्द आ रहा है…',
    closeLabel:        'अभी नहीं — कल वापस आओ',
    upgradeHero:       'अनलिमिटेड अनलॉक करें — रोज़ बिना रुकावट',
    upgradeButton:     'अनलिमिटेड सीखें',
    upgradeCloseLabel: 'बंद करें',
    quotaRemaining: (n: number) => `${n} स्लॉट बचे`,
    daysRemaining:  (n: number) => `${n} दिन बाकी`,
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
