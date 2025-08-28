import { setupWorker } from 'msw/browser';
import { handlers } from './server';

// Setup worker for browser environment
export const worker = setupWorker(...handlers);
