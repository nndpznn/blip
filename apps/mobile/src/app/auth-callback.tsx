import { Redirect } from 'expo-router';

/**
 * The OAuth redirect (blip://auth-callback?code=...) is consumed by the auth browser session in
 * AuthProvider. This route only exists so the router never shows "Unmatched Route" if the OS also
 * delivers that URL to the app.
 */
export default function AuthCallback() {
  return <Redirect href="/" />;
}
