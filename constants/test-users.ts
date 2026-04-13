// Dedicated test accounts. All destructive or experimental operations should
// target a user in this list — never a real user. Scripts that mutate user
// data should refuse to run if the target UUID is not in TEST_USER_IDS.
//
// Carl — Jungian test account (animus-test@example.com)
export const TEST_USER_IDS: readonly string[] = [
  'c1a93688-645c-4ab6-bcf3-8ee36b7e1ff8', // carl / animus-test@example.com
];

export function isTestUser(userId: string | null | undefined): boolean {
  if (!userId) return false;
  return TEST_USER_IDS.includes(userId);
}
