import Card from '@/components/server/card'
import Button from '@/components/client/button'

export default function HomePage() {
  return (
    <main className="min-h-screen bg-brand-cream flex flex-col items-center justify-center gap-8 p-8">
      <div className="text-center">
        <h1 className="text-5xl font-black tracking-[-0.04em] text-brand-espresso">
          Saliw
        </h1>
        <p className="mt-2 text-sm font-semibold uppercase tracking-[0.1em] text-brand-brown">
          Worship Music Portal
        </p>
      </div>

      <div className="flex gap-3">
        {[
          'bg-brand-cream border border-brand-brown/20',
          'bg-brand-tan',
          'bg-brand-brown',
          'bg-brand-espresso',
          'bg-brand-darker',
        ].map((cls, i) => (
          <div key={i} className={`w-10 h-10 rounded-lg ${cls}`} />
        ))}
      </div>

      <Card padding="lg" className="w-full max-w-md">
        <h2 className="text-lg font-bold text-brand-espresso mb-4">Artisan Components</h2>
        <div className="flex flex-wrap gap-3 mb-4">
          <Button variant="primary">Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="ghost">Ghost</Button>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="primary" size="sm">Small</Button>
          <Button variant="primary" size="md">Medium</Button>
          <Button variant="primary" size="lg">Large</Button>
        </div>
      </Card>

      <p className="text-xs font-mono text-brand-brown/60 tracking-wide">
        TASK-003 — Artisan UI Foundation
      </p>
    </main>
  )
}
