import 'dotenv/config.js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

// Import all worker modules
import './duplicates-worker';

console.log(
	'All workers have been started and are listening to their respective queues.',
);
