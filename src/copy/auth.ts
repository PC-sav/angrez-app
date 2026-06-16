// All learner-facing auth & onboarding strings in Hindi (Devanagari).
// Sweep this file for Hindi review before shipping.

export const AUTH = {
  bootstrap: {
    loading: 'लोड हो रहा है…',
  },

  languagePick: {
    title: 'अपनी भाषा चुनें',
    hindi: 'हिंदी',
    bengali: 'বাংলা',
    comingSoon: 'जल्द आ रहा है',
  },

  phone: {
    title: 'अपना मोबाइल नंबर डालें',
    subtitle: 'हम आपको एक OTP भेजेंगे',
    placeholder: 'दस अंक',
    button: 'OTP भेजें',
    relogin: 'फिर से लॉगिन करें',
  },

  otp: {
    title: 'OTP डालें',
    subtitle: (phone: string) => `हमने +91${phone} पर भेजा है`,
    button: 'जारी रखें',
    resend: 'दोबारा भेजें',
    resendWait: (s: number) => `दोबारा भेजें (${s}s)`,
    devLabel: 'Dev OTP (stub):',
    wrongCode: 'OTP सही नहीं है — दोबारा कोशिश करें',
    rateLimited: 'थोड़ी देर बाद कोशिश करें',
  },

  onboarding: {
    nameTitle: 'आपका नाम क्या है?',
    nameSubtitle: 'चाहें तो छोड़ सकते हैं — कोई बात नहीं',
    namePlaceholder: 'जैसे: Ravi, Priya…',
    nameSkip: 'छोड़ें',
    nameNext: 'आगे',

    goalTitle: 'आप क्या सीखना चाहते हैं?',
    goals: [
      { slug: 'job_interview', label: 'नौकरी का इंटरव्यू पास करना' },
      { slug: 'travel',        label: 'विदेश यात्रा के लिए' },
      { slug: 'help_child',    label: 'अपने बच्चे की मदद करना' },
      { slug: 'work',          label: 'काम पर अंग्रेज़ी बोलना' },
    ],
    goalNext: 'आगे',

    dailyTitle: 'रोज़ कितना समय?',
    dailyOptions: [
      { minutes: 5,  label: '5 मिनट' },
      { minutes: 10, label: '10 मिनट' },
      { minutes: 15, label: '15 मिनट' },
    ],
    dailyNext: 'शुरू करें',
    welcome: 'बढ़िया! चलिए शुरू करते हैं 🎉',
  },
} as const;
