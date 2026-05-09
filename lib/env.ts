const missingEnv = new Set<string>()

function readEnvValue(name: string, value: string | undefined) {
  const trimmed = value?.trim()
  if (trimmed) return trimmed

  missingEnv.add(name)
  throw new Error(`Missing required environment variable: ${name}`)
}

function readServerEnv(name: string) {
  const value = process.env[name]?.trim()
  if (value) return value

  missingEnv.add(name)
  throw new Error(`Missing required environment variable: ${name}`)
}

export function getPublicEnv(name: `NEXT_PUBLIC_${string}`) {
  switch (name) {
    case 'NEXT_PUBLIC_SUPABASE_URL':
      return readEnvValue(name, process.env.NEXT_PUBLIC_SUPABASE_URL)
    case 'NEXT_PUBLIC_SUPABASE_ANON_KEY':
      return readEnvValue(name, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
    default:
      missingEnv.add(name)
      throw new Error(`Unknown public environment variable: ${name}`)
  }
}

export function getServerEnv(name: string) {
  return readServerEnv(name)
}

export function listMissingEnv() {
  return [...missingEnv]
}

export const env = {
  openAiApiKey: () => getServerEnv('OPENAI_API_KEY'),
  shortApiKey: () => getServerEnv('SHORTAPI_KEY'),
  supabaseAnonKey: () => getPublicEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
  supabaseUrl: () => getPublicEnv('NEXT_PUBLIC_SUPABASE_URL'),
}
