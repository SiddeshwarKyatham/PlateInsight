import { canSubmit } from '../lib/mealWindow';

describe('mealWindow', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
  });

  describe('canSubmit', () => {
    it('should allow submission when no previous submission exists', () => {
      const result = canSubmit(null);
      expect(result).toBe(true);
    });

    it('should allow submission when cooldown has passed', () => {
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
      const result = canSubmit(twoHoursAgo);
      expect(result).toBe(true);
    });

    it('should prevent submission when within cooldown period', () => {
      const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
      const result = canSubmit(thirtyMinutesAgo);
      expect(result).toBe(false);
    });

    it('should handle invalid date strings', () => {
      const result = canSubmit('invalid-date');
      expect(result).toBe(true); // Should allow submission for invalid dates
    });
  });
});