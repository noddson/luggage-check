import { bootstrap } from './initApp/bootstrap.js';

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  bootstrap().catch((error) => {
    console.error('Failed to initialize app', error);
  });
}
