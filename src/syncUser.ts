type ClerkUser = {
  id: string;
  username: string | null;
  imageUrl: string;
  primaryEmailAddress: { emailAddress: string } | null;
};

export async function syncUser(
  user: ClerkUser,
  getToken: () => Promise<string | null>,
): Promise<void> {
  const token = await getToken();
  if (!token) {
    console.warn('No token available for syncing user data');
    return;
  } 

  const email = user.primaryEmailAddress?.emailAddress ?? '';
  const username = user.username ?? email.split('@')[0] ?? user.id;

  try {
    await fetch('/api/sync-user', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        id: user.id,
        username,
        email,
        avatar_url: user.imageUrl ?? null,
      }),
    });
  } catch {
    // Sync failures are non-fatal; the app continues normally
    console.warn('Failed to sync user data with server');
  }
}
