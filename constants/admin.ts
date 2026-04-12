// Users in this list always count as premium, regardless of RevenueCat state.
// Used to grant full access to the founder / internal testers without
// requiring a real subscription purchase.
export const ADMIN_USER_IDS: readonly string[] = [
  'a872fa8e-c789-4eb1-84b9-671981b5fd60', // huntercfinley@gmail.com
];

export function isAdminUser(userId: string | null | undefined): boolean {
  if (!userId) return false;
  return ADMIN_USER_IDS.includes(userId);
}
