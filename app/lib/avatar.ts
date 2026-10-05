export function buildAvatarAnswers(description: string, presentation: string) {
  const answers: Record<number, string> = { 0: description }
  if (!['Use my description', 'No preference'].includes(presentation)) {
    answers[1] = `Gender presentation: ${presentation}. Follow this choice; do not infer or substitute another presentation.`
  }
  return answers
}

export function buildAvatarIdentityDescription(description: string, presentation: string) {
  const direction = buildAvatarAnswers('', presentation)[1]
  return direction ? `${direction}\n\n${description}` : description
}
