import { hello } from './index';

describe('hello', () => {
  it('should return greeting', () => {
    expect(hello()).toContain('Hello');
  });
});
