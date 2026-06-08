export function errorToMessage(error: unknown): string {
  if (error instanceof Error) return error.message

  if (error && typeof error === 'object') {
    const parts = ['message', 'code', 'details', 'hint']
      .map(key => {
        const value = (error as Record<string, unknown>)[key]
        return typeof value === 'string' && value.trim()
          ? `${key}: ${value}`
          : null
      })
      .filter(Boolean)

    if (parts.length > 0) return parts.join(' | ')
  }

  return 'Unknown Supagate admin error.'
}

