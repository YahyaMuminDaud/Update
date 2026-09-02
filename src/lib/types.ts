export type ComplaintDTO = {
  id: string;
  body: string;
  authorId: string;
  authorName: string;
  groupId: string;
  createdAt: string;
  updatedAt: string;
};

export type GroupDTO = {
  id: string;
  name: string;
  role: "OWNER" | "MEMBER";
  inviteCode?: string | null;
};

export type GroupMemberDTO = {
  userId: string;
  username: string;
  role: "OWNER" | "MEMBER";
};
