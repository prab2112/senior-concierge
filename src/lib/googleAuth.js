// Loads Google Identity Services and requests a real Google ID token,
// which App.jsx then sends to the backend's POST /auth/google to verify
// server-side (see server/src/routes/auth.routes.js). Written against
// the real GSI API but not runnable end-to-end without a real
// VITE_GOOGLE_CLIENT_ID / GOOGLE_CLIENT_ID pair -- see PRODUCTION_READINESS.md.
const SCRIPT_SRC = 'https://accounts.google.com/gsi/client'

let scriptPromise = null

function loadScript() {
  if (window.google?.accounts?.id) return Promise.resolve()
  if (scriptPromise) return scriptPromise

  scriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = SCRIPT_SRC
    script.async = true
    script.defer = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Could not load Google Sign-In. Check your connection and try again.'))
    document.head.appendChild(script)
  })
  return scriptPromise
}

export async function getGoogleIdToken(clientId) {
  if (!clientId) {
    throw new Error('Google sign-in is not configured (VITE_GOOGLE_CLIENT_ID unset).')
  }
  await loadScript()

  return new Promise((resolve, reject) => {
    window.google.accounts.id.initialize({
      client_id: clientId,
      callback: (response) => {
        if (response?.credential) resolve(response.credential)
        else reject(new Error('Google sign-in did not return a credential.'))
      },
    })
    window.google.accounts.id.prompt((notification) => {
      if (notification.isNotDisplayed?.() || notification.isSkippedMoment?.()) {
        reject(new Error('Google sign-in was closed or blocked before completing.'))
      }
    })
  })
}
