import { Redirect } from 'expo-router'

// Android apre l'indirizzo di ritorno dell'accesso (acme://auth-callback) come se fosse una pagina dell'app.
// La sessione viene letta dal browser di accesso in src/services/auth.ts: qui basta tornare alla home,
// altrimenti expo-router mostra "pagina non trovata" e ricostruisce tutta l'app.
const AuthCallback = () => <Redirect href="/" />

export default AuthCallback
