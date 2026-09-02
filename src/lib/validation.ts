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

export const GROUP_NAME_MIN_LENGTH = 3;
export const GROUP_NAME_MAX_LENGTH = 30;

export function parseGroupName(input: unknown): string {
  if (typeof input !== "string") {
    throw new Error("Group name must be a string");
  }
  const trimmed = input.trim();
  if (trimmed.length < GROUP_NAME_MIN_LENGTH || trimmed.length > GROUP_NAME_MAX_LENGTH) {
    throw new Error(`Group name must be ${GROUP_NAME_MIN_LENGTH}-${GROUP_NAME_MAX_LENGTH} characters`);
  }
  return trimmed;
}

export function parseInviteCode(input: unknown): string {
  if (typeof input !== "string") {
    throw new Error("Invite code must be a string");
  }
  const trimmed = input.trim().toUpperCase();
  if (trimmed.length === 0) {
    throw new Error("Invite code can't be empty");
  }
  return trimmed;
}
