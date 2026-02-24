import React, { useState, useEffect } from 'react'
import ReactDOM from 'react-dom/client'
import { supabase } from './supabase'
import App from './App'
import AuthScreen from './AuthScreen'

function Root() {
  const [session, setSession] = useState(undefined) // undefined=loading, null=unauthed, object=authed

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  if (session === undefined) return null // loading
  if (!session) return <AuthScreen />
  return <App session={session} />
}

ReactDOM.createRoot(document.getElementById('root')).render(<Root />)
