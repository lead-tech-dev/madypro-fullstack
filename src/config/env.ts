const resolveApiUrl = () => {
  if (process.env.EXPO_PUBLIC_API_URL && process.env.EXPO_PUBLIC_API_URL.trim().length > 0) {
    return process.env.EXPO_PUBLIC_API_URL.trim().replace(/\/$/, '');
  }
  // fallback to production backend (pas de nom de domaine pour le moment : URL AWS, port 80
  // pour éviter les blocages de ports non-standards sur les réseaux mobiles)
  return 'http://ec2-15-237-203-194.eu-west-3.compute.amazonaws.com';
};

export const env = {
  apiUrl: resolveApiUrl(),
};
