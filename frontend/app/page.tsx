import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export default async function RootPage() {
  const cookieStore = await cookies()
  const token = cookieStore.get('mb_token')?.value
  if (token) {
    redirect('/home')
  } else {
    redirect('/login')
  }
}
