import { getClientSessionToken, revokeClientSession } from '../_shared/clientSession'

export default async function logoutClient(req: { params: Record<string, unknown>; user: User }) {
  await revokeClientSession(getClientSessionToken(req))
  return { success: true }
}
