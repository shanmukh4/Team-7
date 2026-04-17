import Link from 'next/link'

export default function AdminDashboardPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 p-8 lg:p-10">
      <div className="max-w-5xl mx-auto space-y-8">
        <div className="rounded-3xl border border-border/60 bg-card p-8 shadow-xl">
          <div className="flex flex-col gap-3">
            <div className="text-sm uppercase tracking-[0.24em] text-muted-foreground">Admin Dashboard</div>
            <h1 className="text-4xl font-bold text-foreground">Welcome back, Administrator</h1>
            <p className="text-muted-foreground max-w-2xl">
              This area is reserved for admin users. From here you can manage users, review platform health, and navigate to the control panel.
            </p>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-border/60 bg-background p-6">
              <h2 className="text-xl font-semibold text-foreground">User management</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Manage account access and review user roles from the admin control panel.
              </p>
            </div>
            <div className="rounded-2xl border border-border/60 bg-background p-6">
              <h2 className="text-xl font-semibold text-foreground">Secure access</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Only users with <strong>admin</strong> session cookies can access this route.
              </p>
            </div>
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/admin" className="inline-flex items-center justify-center rounded-full bg-primary px-5 py-3 text-sm font-semibold text-white shadow hover:bg-primary/90">
              Open Admin Control Panel
            </Link>
            <Link href="/dashboard" className="inline-flex items-center justify-center rounded-full border border-border bg-background px-5 py-3 text-sm font-semibold text-foreground shadow hover:border-gray-300">
              Return to dashboard overview
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
