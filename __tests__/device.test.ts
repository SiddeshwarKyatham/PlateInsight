import { getDeviceId } from '../lib/device';

describe('device', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
  });

  describe('getDeviceId', () => {
    it('should generate a device ID if none exists', () => {
      const deviceId = getDeviceId();
      expect(deviceId).toBeDefined();
      expect(typeof deviceId).toBe('string');
      expect(deviceId.length).toBeGreaterThan(0);
    });

    it('should return the same device ID on subsequent calls', () => {
      const deviceId1 = getDeviceId();
      const deviceId2 = getDeviceId();
      expect(deviceId1).toBe(deviceId2);
    });

    it('should persist device ID in localStorage', () => {
      const deviceId = getDeviceId();
      expect(localStorage.getItem('device_id')).toBe(deviceId);
    });

    it('should use existing device ID from localStorage', () => {
      const existingId = 'existing-device-id';
      localStorage.setItem('device_id', existingId);
      const deviceId = getDeviceId();
      expect(deviceId).toBe(existingId);
    });
  });
});