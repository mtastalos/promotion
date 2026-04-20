import './config/env'; // Validate env vars before anything else
import { createApp } from './app';
import { env } from './config/env';
import { startPostSchedulerWorker } from './workers/postScheduler.worker';
import { startAnalyticsSyncWorker } from './workers/analyticsSync.worker';

const app = createApp();

app.listen(env.PORT, () => {
  console.log(`Server running on port ${env.PORT} [${env.NODE_ENV}]`);

  startPostSchedulerWorker();
  startAnalyticsSyncWorker();
});
