export async function connectProvider(onStatus: (status: string) => void = () => {}) {
  const post = async (endpoint) => {
    const r = await fetch('/api/studio/' + endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    });
    const data = await r.json();
    if (!r.ok) throw Error(data.error);
    return data;
  };
  try {
    return await post('connect');
  } catch (error) {
    if (!window.makepaceDesktop || !/sign in/i.test(error.message)) throw error;
  }
  const login = await post('provider-login');
  await window.makepaceDesktop.openSignIn(login.authUrl);
  onStatus('browser');
  for (let attempt = 0; attempt < 120; attempt++) {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    const response = await fetch('/api/studio/state');
    if (!response.ok) throw Error('Local provider connection stopped.');
    const state = await response.json();
    if (state.connected) return state;
  }
  throw Error('Sign-in is still pending. Finish in your browser, then press Connect.');
}
