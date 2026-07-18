'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

// Supabase auth identifies users by email. The login form asks for a friendly
// username instead, so map known usernames to the underlying auth email. Anything
// containing "@" is treated as an email and passed through unchanged.
const USERNAME_TO_EMAIL: Record<string, string> = {
  'nogamaivar': 'noga@financialbreathing.com',
  'noga meivar': 'noga@financialbreathing.com',
}

export async function login(formData: FormData) {
  const supabase = await createClient()

  const rawUser = ((formData.get('email') as string) || '').trim()
  const email = rawUser.includes('@')
    ? rawUser
    : (USERNAME_TO_EMAIL[rawUser.toLowerCase()] || rawUser)

  const data = {
    email,
    password: formData.get('password') as string,
  }

  const { error } = await supabase.auth.signInWithPassword(data)

  if (error) {
    redirect('/login?error=true')
  }

  revalidatePath('/', 'layout')
  redirect('/')
}
