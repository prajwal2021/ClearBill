import { createRouteHandlerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { cache } from 'react'

export const createClient = cache(() => {
  const cookieStore = cookies()
  return createRouteHandlerClient({
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value
      },
    },
  })
})

