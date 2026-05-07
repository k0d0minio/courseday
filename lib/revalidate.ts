import { revalidatePath } from 'next/cache'

export function revalidateDay(date?: string | null) {
  revalidatePath('/[tenant]/day/[date]', 'page')
  revalidatePath('/[tenant]', 'page')
  if (date) {
    revalidatePath(`/[tenant]/day/${date}`, 'page')
  }
}
