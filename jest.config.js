module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    roots: ['<rootDir>/src'],
    testMatch: ['**/__tests__/**/*.test.ts'],
    maxWorkers: 1,
    forceExit: true,
    testTimeout: 30000,
    collectCoverageFrom: [
        'src/**/*.ts',
        '!src/**/*.d.ts',
        '!src/index.ts',
        '!src/app.ts',
        '!src/__tests__/**',
    ],
    setupFilesAfterEnv: ['<rootDir>/src/__tests__/setup.ts'],
};