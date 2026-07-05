import { expect, test, type Page } from '@playwright/test'

const evidenceFixturePath = new URL('./fixtures/evidence.txt', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')

type MockQuestion = {
  id: number
  question_text: string
  question_type: string
  is_required: boolean
  help_text: string | null
  sort_order?: number
}

type MockState = {
  invitation?: {
    token: string
    id: number
    email: string
    full_name: string
    invited_by: string | null
    expires_at: string
    display_status: string
  }
  session: {
    session_token: string
    client: {
      id: number
      full_name: string
      email: string
      created_at: string
      onboarding_status?: string | null
    } | null
  }
  profileFields: Array<{
    id: number
    field_key: string
    field_label: string
    field_type: string
    is_required: boolean
    placeholder: string | null
    help_text: string | null
    options: Array<{ label: string; value: string }> | null
  }>
  profileData: Record<string, string>
  assignments: Array<{
    id: number
    question_set_id: number
    question_set_title: string
    declaration_type: string
    description: string | null
    question_count: number
    required_count: number
    assigned_at: string
    due_date: string | null
    status: string
    notes: string | null
  }>
  questionsByType: Record<string, MockQuestion[]>
  declarations: Array<{
    id: number
    client_name: string
    client_email: string
    declaration_type: string
    subject: string
    content: string
    status: string
    submitted_at: string
    updated_at: string
    feedback_count: number
    last_reviewed_at: string | null
  }>
  declarationAnswers: Record<number, Array<{
    id: number
    declaration_id: number
    question_id: number
    question_text: string
    question_type: string
    text_answer: string | null
    bool_answer: boolean | null
    file_id: string | null
    file_name: string | null
    file_mime_type: string | null
    file_url?: string | null
    created_at: string
  }>>
  declarationFeedback: Record<number, Array<{
    id: number
    declaration_id: number
    reviewer_name: string
    reviewer_email: string | null
    feedback_type: string
    verification_status: string
    comments: string | null
    reviewed_at: string
  }>>
  uploads: Array<{
    fileId: string
    fileName: string
    mimeType: string
    url: string
  }>
}

function createBaseState(overrides?: Partial<MockState>): MockState {
  return {
    invitation: {
      token: 'invite-token-1',
      id: 1,
      email: 'client@example.com',
      full_name: 'Taylor Client',
      invited_by: 'Operations Admin',
      expires_at: '2030-01-01T00:00:00.000Z',
      display_status: 'pending',
    },
    session: {
      session_token: 'session-token-1',
      client: null,
    },
    profileFields: [
      {
        id: 1,
        field_key: 'company_name',
        field_label: 'Company Name',
        field_type: 'text',
        is_required: true,
        placeholder: 'Acme Holdings',
        help_text: null,
        options: null,
      },
      {
        id: 2,
        field_key: 'country',
        field_label: 'Country',
        field_type: 'select',
        is_required: true,
        placeholder: null,
        help_text: null,
        options: [
          { label: 'Thailand', value: 'TH' },
          { label: 'United States', value: 'US' },
        ],
      },
    ],
    profileData: {},
    assignments: [
      {
        id: 9001,
        question_set_id: 301,
        question_set_title: 'Quarterly Compliance Survey',
        declaration_type: 'Compliance Declaration',
        description: 'Assigned compliance survey',
        question_count: 2,
        required_count: 2,
        assigned_at: '2026-07-01T10:00:00.000Z',
        due_date: '2026-07-10T00:00:00.000Z',
        status: 'pending',
        notes: 'Please complete this before the filing deadline.',
      },
    ],
    questionsByType: {
      'Compliance Declaration': [
        {
          id: 501,
          question_text: 'Describe the compliance control.',
          question_type: 'open_text',
          is_required: true,
          help_text: null,
        },
        {
          id: 502,
          question_text: 'Has the policy been approved?',
          question_type: 'yes_no',
          is_required: true,
          help_text: null,
        },
      ],
      'Financial Disclosure': [
        {
          id: 601,
          question_text: 'Attach the supporting evidence file.',
          question_type: 'file_upload',
          is_required: true,
          help_text: 'Accepted: PDF, DOCX, TXT',
        },
        {
          id: 602,
          question_text: 'Provide a short explanation.',
          question_type: 'open_text',
          is_required: true,
          help_text: null,
        },
      ],
    },
    declarations: [
      {
        id: 7001,
        client_name: 'Taylor Client',
        client_email: 'client@example.com',
        declaration_type: 'Financial Disclosure',
        subject: 'Annual financial disclosure',
        content: 'Disclosure already submitted.',
        status: 'pending',
        submitted_at: '2026-07-01T08:00:00.000Z',
        updated_at: '2026-07-01T08:00:00.000Z',
        feedback_count: 0,
        last_reviewed_at: null,
      },
    ],
    declarationAnswers: {
      7001: [
        {
          id: 1,
          declaration_id: 7001,
          question_id: 601,
          question_text: 'Attach the supporting evidence file.',
          question_type: 'file_upload',
          text_answer: null,
          bool_answer: null,
          file_id: 'file-existing-1',
          file_name: 'existing-evidence.pdf',
          file_mime_type: 'application/pdf',
          file_url: 'https://example.test/files/existing-evidence.pdf',
          created_at: '2026-07-01T08:00:00.000Z',
        },
      ],
    },
    declarationFeedback: {
      7001: [],
    },
    uploads: [],
    ...overrides,
  }
}

async function installMockBackend(page: Page, state: MockState) {
  await page.addInitScript((seed: MockState) => {
    const clone = JSON.parse(JSON.stringify(seed)) as MockState
    let declarationIdCounter = 8000
    let feedbackIdCounter = 100
    let uploadCounter = 1

    ;(window as { __lastOpenedUrl?: string }).__lastOpenedUrl = ''
    window.open = ((url?: string | URL | undefined) => {
      ;(window as { __lastOpenedUrl?: string }).__lastOpenedUrl = typeof url === 'string' ? url : url?.toString() ?? ''
      return null
    }) as typeof window.open

    if (clone.session.client) {
      document.cookie = `portal_client_session=${encodeURIComponent(clone.session.session_token)}; Path=/; SameSite=Lax`
    }

    function requireSession(params: Record<string, unknown>) {
      if (!clone.session.client || params.__session !== clone.session.session_token) {
        throw new Error('You must be signed in to continue.')
      }

      return clone.session.client
    }

    function getQuestionsForType(type: string) {
      return clone.questionsByType[type] ?? []
    }

    function buildDeclarationAnswers(declarationId: number, answers: Array<Record<string, unknown>>) {
      return answers.map((answer, index) => ({
        id: declarationId * 100 + index + 1,
        declaration_id: declarationId,
        question_id: Number(answer.question_id),
        question_text: String(answer.question_text),
        question_type: String(answer.question_type),
        text_answer: typeof answer.text_answer === 'string' ? answer.text_answer : null,
        bool_answer: typeof answer.bool_answer === 'boolean' ? answer.bool_answer : null,
        file_id: typeof answer.file_id === 'string' ? answer.file_id : null,
        file_name: typeof answer.file_name === 'string' ? answer.file_name : null,
        file_mime_type: typeof answer.file_mime_type === 'string' ? answer.file_mime_type : null,
        file_url: typeof answer.file_id === 'string'
          ? clone.uploads.find(upload => upload.fileId === answer.file_id)?.url ?? null
          : null,
        created_at: new Date().toISOString(),
      }))
    }

    ;(window as any).__PORTAL_BACKEND__ = {
      async invoke(operation: string, rawParams?: Record<string, unknown>) {
        const params = rawParams ?? {}

        switch (operation) {
          case 'auth.getClientSession': {
            if (!clone.session.client || params.__session !== clone.session.session_token) {
              return { client: null }
            }

            return { client: clone.session.client }
          }
          case 'auth.logoutClient': {
            clone.session.client = null
            return { success: true }
          }
          case 'admin.getInvitationByToken': {
            if (!clone.invitation || params.token !== clone.invitation.token) {
              return null
            }

            return clone.invitation
          }
          case 'admin.acceptInvitation': {
            if (!clone.invitation || params.token !== clone.invitation.token) {
              throw new Error('This invitation link is invalid.')
            }

            clone.session.client = {
              id: 101,
              full_name: clone.invitation.full_name,
              email: clone.invitation.email,
              created_at: '2026-07-05T00:00:00.000Z',
              onboarding_status: 'pending',
            }
            clone.invitation.display_status = 'accepted'

            return {
              session_token: clone.session.session_token,
              client: clone.session.client,
            }
          }
          case 'clients.loginClient': {
            clone.session.client = {
              id: 101,
              full_name: 'Taylor Client',
              email: String(params.email ?? 'client@example.com'),
              created_at: '2026-07-05T00:00:00.000Z',
              onboarding_status: 'complete',
            }

            return {
              session_token: clone.session.session_token,
              client: clone.session.client,
            }
          }
          case 'client.getOnboardingFields': {
            const client = requireSession(params)
            return {
              client: {
                onboarding_status: client.onboarding_status ?? 'pending',
                profile_data: clone.profileData,
              },
              fields: clone.profileFields,
            }
          }
          case 'client.saveClientProfile': {
            const client = requireSession(params)
            clone.profileData = (params.profile_data as Record<string, string>) ?? {}
            client.onboarding_status = 'complete'
            return {
              id: client.id,
              full_name: client.full_name,
              email: client.email,
              onboarding_status: 'complete',
              profile_data: clone.profileData,
            }
          }
          case 'client.getMyAssignments': {
            requireSession(params)
            return clone.assignments
          }
          case 'questions.getQuestionsForType': {
            return {
              questions: getQuestionsForType(String(params.declaration_type ?? '')),
            }
          }
          case 'declarations.uploadDeclarationFile': {
            requireSession(params)
            const nextUpload = {
              fileId: `file-upload-${uploadCounter++}`,
              fileName: String(params.fileName ?? 'upload.txt'),
              mimeType: String(params.mimeType ?? 'application/octet-stream'),
              url: `https://example.test/uploads/${uploadCounter}.txt`,
            }
            clone.uploads.push(nextUpload)
            return {
              fileId: nextUpload.fileId,
              fileName: nextUpload.fileName,
            }
          }
          case 'client.submitAssignment': {
            const client = requireSession(params)
            const assignmentId = Number(params.assignment_id)
            const assignment = clone.assignments.find(item => item.id === assignmentId)
            if (!assignment) throw new Error('Assignment not found.')

            assignment.status = 'submitted'
            const declarationId = ++declarationIdCounter
            clone.declarations.unshift({
              id: declarationId,
              client_name: client.full_name,
              client_email: client.email,
              declaration_type: assignment.declaration_type,
              subject: `${assignment.question_set_title} — Assigned Survey`,
              content: `Submission for assigned question set: "${assignment.question_set_title}"`,
              status: 'pending',
              submitted_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              feedback_count: 0,
              last_reviewed_at: null,
            })
            clone.declarationAnswers[declarationId] = buildDeclarationAnswers(declarationId, (params.answers as Array<Record<string, unknown>>) ?? [])
            clone.declarationFeedback[declarationId] = []

            return { declaration_id: declarationId }
          }
          case 'declarations.submitDeclarationWithAnswers': {
            const client = requireSession(params)
            const declarationId = ++declarationIdCounter
            clone.declarations.unshift({
              id: declarationId,
              client_name: client.full_name,
              client_email: client.email,
              declaration_type: String(params.declaration_type),
              subject: String(params.subject),
              content: String(params.content),
              status: 'pending',
              submitted_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              feedback_count: 0,
              last_reviewed_at: null,
            })
            clone.declarationAnswers[declarationId] = buildDeclarationAnswers(declarationId, (params.answers as Array<Record<string, unknown>>) ?? [])
            clone.declarationFeedback[declarationId] = []

            return { id: declarationId }
          }
          case 'declarations.getDeclarations': {
            const status = String(params.status ?? 'all')
            const search = String(params.search ?? '').toLowerCase()

            return clone.declarations.filter(declaration => {
              const matchesStatus = status === 'all' ? true : declaration.status === status
              const matchesSearch = search.length === 0
                ? true
                : [
                    declaration.client_name,
                    declaration.client_email,
                    declaration.subject,
                    declaration.declaration_type,
                  ].some(value => value.toLowerCase().includes(search))

              return matchesStatus && matchesSearch
            })
          }
          case 'declarations.getDeclarationById': {
            const declarationId = Number(params.id)
            const declaration = clone.declarations.find(item => item.id === declarationId) ?? null
            return {
              declaration,
              answers: clone.declarationAnswers[declarationId] ?? [],
              feedback: clone.declarationFeedback[declarationId] ?? [],
            }
          }
          case 'declarations.getEvidenceFileAccess': {
            const declarationId = Number(params.declaration_id)
            const fileId = String(params.file_id)
            const answer = (clone.declarationAnswers[declarationId] ?? []).find(item => item.file_id === fileId)
            if (!answer || !answer.file_url) {
              throw new Error('Evidence file is not available.')
            }

            return {
              file_id: fileId,
              file_name: answer.file_name,
              mime_type: answer.file_mime_type,
              url: answer.file_url,
            }
          }
          case 'declarations.submitFeedback': {
            const declarationId = Number(params.declaration_id)
            const declaration = clone.declarations.find(item => item.id === declarationId)
            if (!declaration) throw new Error('Declaration not found.')

            if (typeof params.update_declaration_status === 'string' && params.update_declaration_status.length > 0) {
              declaration.status = params.update_declaration_status
              declaration.updated_at = new Date().toISOString()
            }

            const feedback = {
              id: ++feedbackIdCounter,
              declaration_id: declarationId,
              reviewer_name: String(params.reviewer_name ?? 'Portal Reviewer'),
              reviewer_email: typeof params.reviewer_email === 'string' ? params.reviewer_email : null,
              feedback_type: String(params.feedback_type),
              verification_status: String(params.verification_status),
              comments: typeof params.comments === 'string' ? params.comments : null,
              reviewed_at: new Date().toISOString(),
            }
            declaration.feedback_count += 1
            declaration.last_reviewed_at = feedback.reviewed_at
            clone.declarationFeedback[declarationId] = [feedback, ...(clone.declarationFeedback[declarationId] ?? [])]
            return feedback
          }
          default:
            throw new Error(`Unhandled mock operation: ${operation}`)
        }
      },
    }
  }, state)
}

test('invite acceptance completes onboarding and reaches the client dashboard', async ({ page }) => {
  await installMockBackend(page, createBaseState())

  await page.goto('/invite/invite-token-1')
  await expect(page.getByRole('heading', { name: 'Accept Your Invitation' })).toBeVisible()

  await page.getByLabel('Choose a Password *').fill('Password123')
  await page.getByLabel('Confirm Password *').fill('Password123')
  await page.getByRole('button', { name: 'Activate Account & Sign In' }).click()

  await expect(page.getByText('Identity Onboarding')).toBeVisible()
  await expect(page.getByPlaceholder('Acme Holdings')).toBeVisible()

  await page.getByPlaceholder('Acme Holdings').fill('Acme Holdings')
  await page.getByRole('combobox').click()
  await page.getByRole('option', { name: 'Thailand' }).click()
  await page.getByRole('button', { name: /Complete Onboarding/i }).click()

  await expect(page.getByText('Pending Assignments')).toBeVisible()
  await expect(page.getByText('Quarterly Compliance Survey')).toBeVisible()
})

test('client sign-in returns to the dashboard and submits an assigned questionnaire', async ({ page }) => {
  const state = createBaseState({
    session: {
      session_token: 'session-token-1',
      client: null,
    },
  })
  await installMockBackend(page, state)

  await page.goto('/client-dashboard')
  await expect(page).toHaveURL(/\/client-login$/)

  await page.getByLabel('Email Address').fill('client@example.com')
  await page.locator('#login-password').fill('Password123')
  await page.getByRole('button', { name: 'Sign In' }).click()

  await expect(page).toHaveURL(/\/client-dashboard$/)
  await page.getByRole('button', { name: /Fill in/i }).click()
  await expect(page.getByText('Describe the compliance control.')).toBeVisible()

  await page.getByPlaceholder('Your response…').fill('Reviewed by compliance operations.')
  await page.getByRole('button', { name: 'Yes' }).click()
  await page.getByRole('button', { name: 'Submit Answers' }).click({ noWaitAfter: true })

  await expect(page.getByText('Answers submitted successfully.')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Submitted' })).toBeVisible()
})

test('authenticated client submits a self-service declaration with dynamic questions and file evidence', async ({ page }) => {
  const state = createBaseState({
    session: {
      session_token: 'session-token-1',
      client: {
        id: 101,
        full_name: 'Taylor Client',
        email: 'client@example.com',
        created_at: '2026-07-05T00:00:00.000Z',
        onboarding_status: 'complete',
      },
    },
  })
  await installMockBackend(page, state)

  await page.goto('/new')
  await expect(page.getByText('Declaration Details')).toBeVisible()

  await page.getByRole('combobox').click()
  await page.getByRole('option', { name: 'Financial Disclosure' }).click()
  await page.getByPlaceholder('e.g. Annual Income & Assets Declaration').fill('Quarterly asset disclosure')
  await page.getByPlaceholder('Provide your declaration statement here…').fill('Submitting the required declaration and supporting evidence.')
  await page.locator('input[type="file"]').setInputFiles(evidenceFixturePath)
  await page.getByPlaceholder('Your response…').fill('Supporting evidence attached.')
  await page.getByRole('button', { name: 'Submit Declaration' }).click()

  await expect(page.getByText('Declaration Submitted!')).toBeVisible()
})

test('admin reviews a declaration, opens evidence, and submits feedback with a status decision', async ({ page }) => {
  await installMockBackend(page, createBaseState())

  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Client Declarations' })).toBeVisible()
  await page.getByRole('button', { name: /Annual financial disclosure/i }).click()

  await expect(page.getByText('existing-evidence.pdf')).toBeVisible()
  await page.getByRole('button', { name: 'existing-evidence.pdf' }).click()
  await expect.poll(async () => page.evaluate(() => (window as { __lastOpenedUrl?: string }).__lastOpenedUrl ?? '')).toMatch(/existing-evidence\.pdf/)

  await page.getByRole('button', { name: 'Add Feedback' }).click()
  await page.getByLabel('Reviewer Name').fill('Portal Reviewer')
  await page.getByRole('combobox').nth(0).click()
  await page.getByRole('option', { name: /Information Verification/i }).click()
  await page.getByRole('combobox').nth(1).click()
  await page.getByRole('option', { name: 'Verified', exact: true }).click()
  await page.getByRole('combobox').nth(2).click()
  await page.getByRole('option', { name: 'Set to Approved' }).click()
  await page.getByLabel('Comments').fill('Evidence and declaration were reviewed successfully.')
  await page.getByRole('button', { name: 'Submit Feedback' }).click()

  await expect(page.getByText('Feedback submitted successfully.')).toBeVisible()
  await expect(page.getByText('Status: Approved')).toBeVisible()
  await expect(page.getByText('Portal Reviewer')).toBeVisible()
})
