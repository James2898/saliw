import type { ReactNode } from 'react'
import Card from '@/components/server/card'

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-brand-cream p-4 sm:p-8 flex flex-col">
      <div className="w-full max-w-5xl mx-auto flex-1 flex flex-col">
        <Card padding="lg" className="flex-1">
          {children}
        </Card>
      </div>
    </div>
  )
}
