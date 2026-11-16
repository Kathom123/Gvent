import { redirect } from 'next/navigation'
import { appAuth } from '@/lib/app-auth'
import Dashboard from '@/components/gasvent/Dashboard'

export default async function DashboardPage() {
  const user = await appAuth.getCurrentUser()
  if (!user) redirect('/')
  return <Dashboard displayName={user.displayName || user.username || 'Agua'} />
}
