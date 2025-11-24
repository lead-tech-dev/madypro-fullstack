export const DbConfig = () => ({
  database: {
    url: process.env.DATABASE_URL ?? 'postgres://user:password@localhost:5432/madypro_clean',
  },
});
