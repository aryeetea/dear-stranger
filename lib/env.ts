const missingEnv = new Set<string>()

function readEnv(name: string) {
  const value = process.env[name]?.trim()
  if (value) return value

  missingEnv.add(name)
  throw new Error(`Missing required environment variable: ${name}`)
}

export function getPublicEnv(name: `NEXT_PUBLIC_${string}`) {
  return readEnv(name)
}

export function getServerEnv(name: string) {
  return readEnv(name)
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
