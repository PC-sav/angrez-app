export type AuthStackParamList = {
  LanguagePick: undefined;
  Phone: undefined;
  Otp: { phone: string; devOtp?: string };
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
};
