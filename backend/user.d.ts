type User = {
  id?: string | number
  email?: string
  fullName?: string
  firstName?: string
  lastName?: string
  groups?: string[]
  roles?: string[]
}

type RetoolQueryResult<T> = {
  data: T[]
}

declare const retoolDb: {
  query<T = Record<string, unknown>>(sql: string, values?: unknown[]): Promise<RetoolQueryResult<T>>
}

declare const retoolStorage: {
  upload(input: {
    fileName: string
    data: string
    mimeType: string
    folderName: string
    isPublic: boolean
  }): Promise<{ data: { id: string; name: string; url: string } }>
}

declare const retoolEmail: {
  sendEmail(input: {
    to: string
    subject: string
    bodyType: 'html' | 'text'
    suppressRetoolSignature?: boolean
    body: string
  }): Promise<unknown>
}
