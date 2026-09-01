export type ComplaintDTO = {
  id: string;
  body: string;
  authorId: string;
  authorName: string;
  authorPhoto: string | null;
  createdAt: string;
  updatedAt: string;
};
