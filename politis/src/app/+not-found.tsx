import { Redirect } from 'expo-router';

/** Unknown URLs (e.g. a stale deep link or a web host path) go back to the entry route. */
export default function NotFound() {
  return <Redirect href="/" />;
}
