import type { User } from '@supabase/supabase-js'
import { LogOut } from 'lucide-react'
import { signOut } from '@/app/actions/auth'
import { Button } from '@/components/ui/button'

interface UserMenuProps {
  user: User
  signOutLabel?: string
}

export function UserMenu({ user: _user, signOutLabel = 'Sign out' }: UserMenuProps) {
  return (
    <form action={signOut}>
      <Button
        type="submit"
        variant="ghost"
        size="iconSm"
        className="text-muted-foreground hover:text-foreground"
        aria-label={signOutLabel}
        title={signOutLabel}
        data-testid="sign-out"
      >
        <LogOut className="h-4 w-4" />
      </Button>
    </form>
  )
}
