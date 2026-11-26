// Decide what a newly signed-in account sees when it has no saved copy in the cloud yet.
// Data left on the device by a different account must never be handed to the new one.
export function startsEmpty(previousOwner: string | null, userId: string): boolean {
  return previousOwner !== null && previousOwner !== userId;
}
