import { auth } from '@/app/api/auth/[...nextauth]/route'

export async function getServerSession() {
  // В Next.js 15+ with App Router используем auth() напрямую
  return null // Placeholder - needs proper implementation
}

export { auth }
