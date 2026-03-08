import { useSubmissionStore } from '../lib/submissionStore';

describe('submissionStore', () => {
  beforeEach(() => {
    // Reset the store before each test
    useSubmissionStore.setState({
      image: null,
      mealType: null,
      ecosystemId: null,
      session: null,
    });
  });

  it('should initialize with default values', () => {
    const state = useSubmissionStore.getState();
    expect(state.image).toBeNull();
    expect(state.mealType).toBeNull();
    expect(state.ecosystemId).toBeNull();
    expect(state.session).toBeNull();
  });

  it('should set image correctly', () => {
    const testImage = 'test-image-url';
    useSubmissionStore.getState().setImage(testImage);
    expect(useSubmissionStore.getState().image).toBe(testImage);
  });

  it('should set meal type correctly', () => {
    const testMealType = 'lunch';
    useSubmissionStore.getState().setMealType(testMealType);
    expect(useSubmissionStore.getState().mealType).toBe(testMealType);
  });

  it('should set ecosystem ID correctly', () => {
    const testEcoId = 'test-ecosystem-id';
    useSubmissionStore.getState().setEcosystemId(testEcoId);
    expect(useSubmissionStore.getState().ecosystemId).toBe(testEcoId);
  });

  it('should set session correctly', () => {
    const testSession = 'test-session-id';
    useSubmissionStore.getState().setSession(testSession);
    expect(useSubmissionStore.getState().session).toBe(testSession);
  });
});