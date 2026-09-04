export type ComplaintDTO = {
  id: string;
  body: string;
  authorId: string;
  authorName: string;
  groupId: string;
  createdAt: string;
  updatedAt: string;
};

export type GroupRole = "OWNER" | "ANNOUNCER" | "MEMBER";

export type GroupDTO = {
  id: string;
  name: string;
  role: GroupRole;
  inviteCode?: string | null;
  announceOnly: boolean;
};

export type GroupMemberDTO = {
  userId: string;
  username: string;
  role: GroupRole;
};
