export const INPUT_LIMITS = {
  groupName: 80,
  groupDescription: 500,
  threadContent: 500,
  commentContent: 500,
  topicSubmissionContent: 2000,
  topicSuggestionTitle: 120,
  topicSuggestionDescription: 2000,
  featureSuggestionTitle: 120,
  featureSuggestionDescription: 4000,
  imageUploadMaxBytes: 10 * 1024 * 1024,
} as const

export function remainingChars(limit: number, value: string): number {
  return Math.max(0, limit - value.length)
}
