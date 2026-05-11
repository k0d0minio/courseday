import {
  CalendarCheck,
  Utensils,
  Coffee,
  FileText,
  Sparkles,
  Cloud,
  Users,
  Clock,
  UserCheck,
  CalendarDays,
  Calendar,
  ClipboardList,
  Bell,
  Zap,
  Globe,
  Link2,
  Shield,
  Smartphone,
  Radio,
  Palette,
  ToggleLeft,
} from 'lucide-react'
import { Eyebrow, SectionShell, SectionTitle } from '@/components/landing/section-shell'

type Feature = {
  icon: React.ComponentType<{ className?: string }>
  title: string
  description: string
}

type FeatureGroup = {
  label: string
  features: Feature[]
}

const FEATURE_GROUPS: FeatureGroup[] = [
  {
    label: 'Daily Operations',
    features: [
      {
        icon: CalendarCheck,
        title: 'Activities',
        description:
          'Schedule daily events with times, expected covers, venue assignments, and activity tags.',
      },
      {
        icon: Utensils,
        title: 'Reservations',
        description:
          'Restaurant bookings with guest details, table seating layouts, and allergen tracking.',
      },
      {
        icon: Coffee,
        title: 'Breakfast Config',
        description:
          'Plan group breakfast services with headcounts, seating breakdowns, and dietary requirements.',
      },
      {
        icon: FileText,
        title: 'Day Notes',
        description:
          'Freeform team notes pinned to any day, visible to all staff the moment they are added.',
      },
      {
        icon: Sparkles,
        title: 'AI Daily Brief',
        description:
          "One-click AI summary of the full day's data, ready to share with your team at briefing.",
      },
      {
        icon: Cloud,
        title: 'Weather Reporting',
        description:
          'Live local weather on every day view so staff can anticipate and prepare ahead of time.',
      },
    ],
  },
  {
    label: 'Staff',
    features: [
      {
        icon: Users,
        title: 'Staff Schedule',
        description: 'Assign team members to day shifts and track who is on duty at a glance.',
      },
      {
        icon: Clock,
        title: 'Shift Templates',
        description: 'Save common shift patterns and reuse them instantly to cut scheduling time.',
      },
      {
        icon: UserCheck,
        title: 'Staff Roles',
        description:
          'Define custom roles per venue to keep your team structure clear and auditable.',
      },
      {
        icon: CalendarDays,
        title: 'My Schedule',
        description:
          'Every team member gets a personal view of their upcoming shifts in one place.',
      },
      {
        icon: Calendar,
        title: 'iCal Subscription',
        description:
          'Staff subscribe to their schedule in any calendar app — Google, Apple, or Outlook.',
      },
    ],
  },
  {
    label: 'Planning & Comms',
    features: [
      {
        icon: ClipboardList,
        title: 'Checklists',
        description:
          'Build reusable checklists tied to venue types or activity tags for consistent service.',
      },
      {
        icon: Bell,
        title: 'Notifications',
        description:
          'In-app alerts keep editors informed whenever key changes are made on the platform.',
      },
      {
        icon: Zap,
        title: 'Quick Add',
        description:
          'Paste a WhatsApp message or email — AI parses it into a structured activity instantly.',
      },
      {
        icon: Globe,
        title: 'Multi-language UI',
        description:
          'The full platform is available in English, French, German, and Spanish out of the box.',
      },
    ],
  },
  {
    label: 'Platform',
    features: [
      {
        icon: Link2,
        title: 'Per-tenant Subdomains',
        description:
          'Each venue gets its own branded subdomain for a clean, professional web presence.',
      },
      {
        icon: Shield,
        title: 'Multi-tenant RBAC',
        description:
          'Editors create and manage; viewers read-only. Full role-based access control per venue.',
      },
      {
        icon: Smartphone,
        title: 'PWA Install',
        description:
          'Install on any device — iOS, Android, or desktop — for a native app-quality experience.',
      },
      {
        icon: Radio,
        title: 'Realtime Updates',
        description:
          'Changes broadcast live to all connected devices so every screen stays in sync.',
      },
      {
        icon: Palette,
        title: 'Custom Branding',
        description:
          'Upload your logo and set brand colours. Every tenant has its own distinct look and feel.',
      },
      {
        icon: ToggleLeft,
        title: 'Feature Flags',
        description:
          "Toggle individual modules per tenant to match each venue's exact operational workflow.",
      },
    ],
  },
]

export function Features() {
  return (
    <SectionShell id="features">
      <div className="mb-12 flex flex-col gap-4">
        <Eyebrow>Full feature set</Eyebrow>
        <SectionTitle>Everything your golf operation needs, in one place</SectionTitle>
      </div>

      <div className="space-y-14">
        {FEATURE_GROUPS.map((group) => (
          <div key={group.label}>
            <h3 className="text-muted-foreground mb-5 text-xs font-semibold tracking-widest uppercase">
              {group.label}
            </h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {group.features.map((feature) => (
                <div
                  key={feature.title}
                  className="bg-background flex gap-4 rounded-xl border border-black/5 px-5 py-4 dark:border-white/5"
                >
                  <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-[var(--brand-soft)] text-[var(--brand)]">
                    <feature.icon className="size-4" />
                  </span>
                  <div>
                    <p className="mb-0.5 text-sm font-semibold">{feature.title}</p>
                    <p className="text-muted-foreground text-xs leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </SectionShell>
  )
}
