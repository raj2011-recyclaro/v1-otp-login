// Placeholder for future recurring jobs (example: delete very old sessions).
const runSessionCleanupJob = async () => {
  // In production, schedule this with BullMQ/cron and delete expired sessions.
  return Promise.resolve();
};

module.exports = {
  runSessionCleanupJob
};
