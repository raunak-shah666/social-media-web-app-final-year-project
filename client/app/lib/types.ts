export type APIResponse = {
    data: any;
    status: number;
    message: string;
    success: boolean;
};

export type PostDto = {
    id: number;
    userId: string;
    parentPostId: number | null;
    quotedPostId: number | null;
    content: string;
    visibility: "public" | "followers" | null;
    createdAt: string;
    updatedAt: string;
    author: any | null;
    media: any[];
    parentPost: any | null;
    quotedPost: PostDto | null;
    likeCount: number;
    commentCount: number;
    repostCount: number;
};

export type FeedItem =
    | {
          itemType: "post";
          createdAt: string;
          post: PostDto;
      }
    | {
          itemType: "repost";
          createdAt: string;
          repostedBy: any;
          originalPost: PostDto;
      };

export type UserDto = {
    id: string;
    name: string;
    username: string | null;
    image: string | null;
};

export type MessageDto = {
    id: number;
    senderId: string;
    receiverId: string;
    content: string;
    parentMessageId?: number | null;
    createdAt: string;
    updatedAt: string;
    sender?: UserDto;
    receiver?: UserDto;
    parentMessage?: MessageDto | null;
};

export type ConversationDto = {
    user: UserDto;
    lastMessage: {
        id: number;
        content: string;
        senderId: string;
        receiverId: string;
        createdAt: string;
    };
};

