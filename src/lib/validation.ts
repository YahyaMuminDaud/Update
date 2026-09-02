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

export const USERNAME_MIN_LENGTH = 3;
export const USERNAME_MAX_LENGTH = 20;
const USERNAME_PATTERN = /^[a-zA-Z0-9_]+$/;

export function parseUsername(input: unknown): string {
  if (typeof input !== "string") {
    throw new Error("Username must be a string");
  }
  const trimmed = input.trim();
  if (trimmed.length < USERNAME_MIN_LENGTH || trimmed.length > USERNAME_MAX_LENGTH) {
    throw new Error(`Username must be ${USERNAME_MIN_LENGTH}-${USERNAME_MAX_LENGTH} characters`);
  }
  if (!USERNAME_PATTERN.test(trimmed)) {
    throw new Error("Username can only contain letters, numbers, and underscores");
  }
  return trimmed;
}
