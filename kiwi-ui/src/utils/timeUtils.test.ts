import { describe, it, expect } from 'vitest';

// Example test file for a utility function
// This demonstrates that we can test non-component code as well

describe('Example utility tests', () => {
  it('should perform basic arithmetic', () => {
    expect(2 + 2).toBe(4);
  });

  it('should handle string operations', () => {
    const testString = 'Hello, World!';
    expect(testString.toLowerCase()).toBe('hello, world!');
  });

  it('should work with arrays', () => {
    const testArray = [1, 2, 3];
    expect(testArray.length).toBe(3);
    expect(testArray.includes(2)).toBe(true);
  });
});