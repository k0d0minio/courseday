import { redirect } from 'next/navigation';

/** Self-serve sign-up disabled; owners create venue on root domain. Team joins via invite. */
export default function SignUpPage() {
  redirect('/auth/sign-in');
}
