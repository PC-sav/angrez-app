export type AuthStackParamList = {
  LanguagePick: undefined;
  Phone: undefined;
  Otp: { phone: string; devOtp?: string; referral_code?: string };
  OnboardingName: undefined;
  OnboardingGoal: { name: string | null };
  OnboardingDailyTime: { name: string | null; goal: string };
};

export type TabParamList = {
  Ghar: undefined;
  Safar: undefined;
  Profile: undefined;
};

export type MainStackParamList = {
  Tabs: undefined;
  LessonModal: { lessonId: string };
  Paywall:
    | { source: 'limit'; next_available_at: string }
    | { source: 'upgrade' };
  Checkout: {
    payment_session_id: string;
    order_id: string;
    plan: string;
    amount: number;
  };
  PurchaseResult: undefined;
  WebViewSmokeTest: undefined;
  BillingDevTest: undefined;
};
