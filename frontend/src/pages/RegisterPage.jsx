/**
 * RegisterPage — re-exports the unified AuthPage.
 *
 * Both /login and /register render the same AuthPage component.
 * AuthPage reads location.pathname on mount to decide which tab is active:
 *   /login    → Sign In tab
 *   /register → Register tab
 */
export { default } from './LoginPage.jsx'
