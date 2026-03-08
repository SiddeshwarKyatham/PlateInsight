import { create } from 'zustand';

export interface Dish {
  name: string;
  wastePercent: number;
  foodType?: "veg" | "nonveg" | null;
}

export interface Feedback {
  dishName: string;
  sentiment: 'positive' | 'negative';
  reason?: string;
}

interface SubmissionState {
  image: string | null; // Data URL or object URL
  dishes: Dish[];
  feedback: Feedback[];
  session: string | null;
  ecosystemId: string | null;
  mealType: string | null;
  isDemo: boolean;
  setImage: (image: string | null) => void;
  setDishes: (dishes: Dish[]) => void;
  addFeedback: (feedback: Feedback) => void;
  setSession: (session: string) => void;
  setEcosystemId: (id: string) => void;
  setMealType: (mealType: string) => void;
  setDemo: (isDemo: boolean) => void;
  reset: () => void;
}

export const useSubmissionStore = create<SubmissionState>((set) => ({
  image: null,
  dishes: [],
  feedback: [],
  session: null,
  ecosystemId: null,
  mealType: null,
  isDemo: false,
  setImage: (image) => set({ image }),
  setDishes: (dishes) => set({ dishes }),
  addFeedback: (fb) => set((state) => ({ feedback: [...state.feedback, fb] })),
  setSession: (session) => set({ session }),
  setEcosystemId: (id) => set({ ecosystemId: id }),
  setMealType: (mealType) => set({ mealType }),
  setDemo: (isDemo) => set({ isDemo }),
  reset: () => set(state => ({ 
    image: null, 
    dishes: [], 
    feedback: [], 
    // We intentionally retain session and ecosystemId across multiple submissions 
    // so students can scan once and submit multiple plates if needed.
    session: state.session,
    ecosystemId: state.ecosystemId,
    mealType: state.mealType,
    isDemo: false
  })),
}));
