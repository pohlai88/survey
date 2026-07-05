import { requireClientSession } from '../_shared/clientSession'

export default async function getClientSession(req: { params: Record<string, unknown>; user: User }) {
  const session = await requireClientSession(req)
  return {
    client: session.client,
  }
}
