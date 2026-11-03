import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import {BrowserRouter} from 'react-router-dom'
import { ClerkProvider } from '@clerk/react'

const clerkAppearance = {
  variables: { colorPrimary: '#4f46e5', colorText: '#1e1b4b', colorBackground: '#ffffff', colorInputBackground: '#f6f4ff', colorTextSecondary: '#5b5a85', borderRadius: '0.9rem', fontFamily: 'Work Sans, system-ui, sans-serif' },
  elements: { card: { boxShadow: '0 30px 70px -30px rgba(79,70,229,0.45)', border: '1px solid #e6e3f7' } },
}

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

if(!PUBLISHABLE_KEY){
  throw new Error("Missing VITE_CLERK_PUBLISHABLE_KEY in client environment");
}


createRoot(document.getElementById('root')).render(
  <ClerkProvider publishableKey={PUBLISHABLE_KEY} afterSignOutUrl="/" appearance={clerkAppearance}>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </ClerkProvider>,
)
