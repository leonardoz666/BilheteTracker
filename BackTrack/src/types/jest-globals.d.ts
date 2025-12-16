declare module '@jest/globals' {
  export const describe: typeof import('jest').describe;
  export const it: typeof import('jest').it;
  export const test: typeof import('jest').test;
  export const expect: typeof import('jest').expect;
  export const beforeAll: typeof import('jest').beforeAll;
  export const afterAll: typeof import('jest').afterAll;
  export const beforeEach: typeof import('jest').beforeEach;
  export const afterEach: typeof import('jest').afterEach;
}
