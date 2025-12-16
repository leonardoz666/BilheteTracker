import { describe, it, expect } from 'vitest';
import { AuthManager } from '../lib/auth';

describe('AuthManager', () => {
  it('should have required methods', () => {
    expect(AuthManager).toBeDefined();
    expect(typeof AuthManager.checkAuth).toBe('function');
    expect(typeof AuthManager.logout).toBe('function');
    expect(typeof AuthManager.subscribe).toBe('function');
  });

  it('should subscribe and unsubscribe to auth changes', () => {
    const callback = () => {};
    const unsubscribe = AuthManager.subscribe(callback);
    
    expect(typeof unsubscribe).toBe('function');
    
    // Cleanup
    unsubscribe();
  });
});
