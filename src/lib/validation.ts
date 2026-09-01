export const COMPLAINT_MAX_LENGTH = 280;

export function parseComplaintBody(input: unknown): string {
  if (typeof input !== "string") {
    throw new Error("Complaint body must be a string");
  }
  const trimmed = input.trim();
  if (trimmed.length === 0) {
    throw new Error("Complaint can't be empty");
  }
  if (trimmed.length > COMPLAINT_MAX_LENGTH) {
    throw new Error(`Complaint can't exceed ${COMPLAINT_MAX_LENGTH} characters`);
  }
  return trimmed;
}
