export type Option = {
  label: string;
  value: string;
  subtext?: string;
};

export const reasonsOptions: Option[] = [
  { label: "Exams are eating me alive", value: "Exam Stress" },
  { label: "Something's off with someone close to me", value: "Relationships" },
  { label: "Family stuff, mostly", value: "Family" },
  { label: "Work/career is weighing on me", value: "Career" },
  { label: "I'm just... running on empty", value: "Burnout" },
  { label: "My mind won't stop racing", value: "Anxiety" },
  { label: "I feel like I'm on my own in this", value: "Loneliness" },
  { label: "I overthink everything", value: "Overthinking" },
  { label: "I want to grow into someone better", value: "Personal Growth" },
  { label: "Honestly, just looking around", value: "Just Exploring" },
];

export const emotionOptions: Option[] = [
  { label: "Genuinely good", value: "Happy" },
  { label: "Steady, at peace", value: "Calm" },
  { label: "It's fine, nothing special", value: "Okay" },
  { label: "Stretched thin", value: "Stressed" },
  { label: "On edge", value: "Anxious" },
  { label: "Heavy-hearted", value: "Sad" },
  { label: "Irritated at everything", value: "Frustrated" },
  { label: "Just... hollow", value: "Empty" },
  { label: "Not sure what I'm feeling", value: "Confused" },
  { label: "Tired down to my bones", value: "Exhausted" },
];

export const goalsOptions: Option[] = [
  { label: "Help me breathe easier", value: "Reduce stress" },
  { label: "Help me focus on my studies", value: "Study better" },
  { label: "Help me actually rest", value: "Sleep better" },
  { label: "Help me make sense of what I feel", value: "Understand emotions" },
  { label: "Help me connect better with people", value: "Improve relationships" },
  { label: "Help me believe in myself more", value: "Build confidence" },
  { label: "Give me a moment to reflect each day", value: "Daily reflection" },
  { label: "Just be someone who listens", value: "Someone to listen" },
  { label: "Nudge me toward healthier days", value: "Healthy habits" },
];

export const supportStyleOptions: Option[] = [
  { label: "Gentle Listener", subtext: "Just let me sit with you, no fixing needed.", value: "Gentle Listener" },
  { label: "Supportive Friend", subtext: "Be warm, be on my side, always.", value: "Supportive Friend" },
  { label: "Thought Partner", subtext: "Help me think it through, out loud.", value: "Thought Partner" },
  { label: "Practical Coach", subtext: "Push me toward steady, doable steps.", value: "Practical Coach" },
];

export const languageOptions: Option[] = [
  { label: "English", value: "English" },
  { label: "Hindi", value: "Hindi" },
  { label: "Telugu", value: "Telugu" },
  { label: "Tamil", value: "Tamil" },
];

export const communicationOptions: Option[] = [
  { label: "Voice", value: "Voice" },
  { label: "Text", value: "Text" },
  { label: "Both", value: "Both" },
];

export const checkInOptions: Option[] = [
  { label: "Daily", value: "Daily" },
  { label: "A few times a week", value: "A few times a week" },
  { label: "Only when I open Mythri", value: "Only when I open Mythri" },
  { label: "I'll decide later", value: "I'll decide later" },
];

export const primaryGoalOptions: Option[] = [
  { label: "I want to feel calmer", value: "Feel calmer" },
  { label: "I want to study consistently", value: "Study consistently" },
  { label: "I want to quiet the overthinking", value: "Reduce overthinking" },
  { label: "I want to sleep properly again", value: "Improve sleep" },
  { label: "I want to understand myself better", value: "Understand myself" },
  { label: "I want better relationships", value: "Improve relationships" },
  { label: "No fixed goal — just here", value: "No goal yet" },
];
