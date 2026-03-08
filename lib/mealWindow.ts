export type MealType = "Breakfast" | "Lunch" | "Dinner" | "Outside";

export function getCurrentMealWindow(): MealType {
  const now = new Date();
  const hours = now.getHours();

  if (hours >= 7 && hours < 10) return "Breakfast";
  if (hours >= 12 && hours < 15) return "Lunch";
  if (hours >= 19 && hours < 22) return "Dinner";
  
  return "Outside";
}

export function canSubmit(lastSubmissionTime: string | null, cooldownMinutes: number = 120): boolean {
  if (!lastSubmissionTime) return true;

  const lastSub = new Date(lastSubmissionTime);
  
  // If the date is invalid, allow submission
  if (isNaN(lastSub.getTime())) return true;
  
  const now = new Date();
  
  // Use configurable cooldown
  const diffMinutes = (now.getTime() - lastSub.getTime()) / (1000 * 60);
  
  return diffMinutes >= cooldownMinutes;
}
