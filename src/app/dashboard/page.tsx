import { redirect } from 'next/navigation'
import { createClient } from '@/services/supabase/server'

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <div>
      <h1 className="text-3xl font-extrabold tracking-tight text-brand-espresso mb-2">
        Dashboard
      </h1>
      <p className="text-sm font-semibold uppercase tracking-widest text-brand-brown">
        Worship Music Portal
      </p>
    </div>
  )
}
