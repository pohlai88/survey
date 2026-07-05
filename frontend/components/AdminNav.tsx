import { NavLink } from 'react-router-dom'
import { FileText, ClipboardList, Users, Settings } from 'lucide-react'

export default function AdminNav() {
  return (
    <div className="border-b bg-card">
      <div className="max-w-5xl mx-auto px-6 py-0 flex items-center gap-0">
        {/* Brand */}
        <div className="flex items-center gap-2 pr-6 py-4 border-r mr-2">
          <div className="p-1.5 rounded-md bg-primary/10">
            <FileText className="w-4 h-4 text-primary" />
          </div>
          <span className="font-semibold text-sm text-foreground">Declaration Portal</span>
        </div>

        {/* Nav links */}
        <nav className="flex items-center">
          {[
            { to: '/',                    label: 'Declarations',   icon: FileText,     end: true },
            { to: '/questions',           label: 'Question Sets',  icon: ClipboardList, end: false },
            { to: '/admin/clients',       label: 'Clients',        icon: Users,         end: false },
            { to: '/admin/profile-fields',label: 'Profile Fields', icon: Settings,      end: false },
          ].map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-2 px-4 py-4 text-sm font-medium border-b-2 transition-colors ${
                  isActive
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                }`
              }
            >
              <Icon className="w-4 h-4" />
              {label}
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  )
}
