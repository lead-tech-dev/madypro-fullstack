export const AppConfig = () => ({
  app: {
    port: parseInt(process.env.PORT ?? '3000', 10),
    env: process.env.NODE_ENV ?? 'development',
    autoCloseGraceMinutes: parseInt(process.env.AUTO_CLOSE_GRACE_MINUTES ?? '30', 10),
    autoCloseEnabled: (process.env.AUTO_CLOSE_ENABLED ?? 'true').toLowerCase() === 'true',
    autoCloseIncompleteStatus: process.env.AUTO_CLOSE_INCOMPLETE_STATUS ?? 'NEEDS_REVIEW',
  },
});
