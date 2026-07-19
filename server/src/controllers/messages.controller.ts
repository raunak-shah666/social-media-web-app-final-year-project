import { type Request, type Response } from 'express';
import { db } from '../lib/db/client.js';
import { message } from '../lib/db/schema.js';
import { user } from '../lib/auth-schema.js';
import { AppError } from '../middlewares/errorHandler.js';
import { APIResponse } from '../lib/apiResponse.js';
import { eq, or, and, desc, asc } from 'drizzle-orm';

export async function sendMessage(req: Request, res: Response) {
  try {
    if (!req.session) {
      throw new AppError('User not logged in', 401);
    }
    const senderId = req.session.user.id;
    const { receiverId, content, parentMessageId }: { receiverId: string; content: string; parentMessageId?: number | null } = req.body;

    if (!receiverId) {
      throw new AppError('Receiver ID is required', 400);
    }
    if (!content || !content.trim()) {
      throw new AppError('Message content cannot be empty', 400);
    }

    // Verify receiver exists
    const receiverExists = await db
      .select()
      .from(user)
      .where(eq(user.id, receiverId))
      .limit(1);

    if (receiverExists.length === 0) {
      throw new AppError('Receiver not found', 404);
    }

    // Insert message
    const inserted = await db
      .insert(message)
      .values({
        senderId,
        receiverId,
        content: content.trim(),
        parentMessageId: parentMessageId || null,
      })
      .returning();

    const newMessage = inserted[0];
    if (!newMessage) {
      throw new AppError('Failed to insert message', 500);
    }

    // Fetch the newly created message with sender and receiver relations loaded
    const fullMessage = await db.query.message.findFirst({
      where: eq(message.id, newMessage.id),
      with: {
        sender: true,
        receiver: true,
        parentMessage: {
          with: {
            sender: true,
          }
        }
      },
    });

    return res
      .status(201)
      .json(new APIResponse('Message sent successfully', 201, fullMessage));
  } catch (error) {
    console.error('sendMessage :: ', error);
    throw error instanceof AppError ? error : new AppError();
  }
}

export async function getConversations(req: Request, res: Response) {
  try {
    if (!req.session) {
      throw new AppError('User not logged in', 401);
    }
    const myId = req.session.user.id;

    // Fetch all messages where this user is sender or receiver
    const allMessages = await db.query.message.findMany({
      where: or(eq(message.senderId, myId), eq(message.receiverId, myId)),
      orderBy: [desc(message.createdAt)],
      with: {
        sender: true,
        receiver: true,
      },
    });

    // Group by other user ID to construct a summary of conversations
    const conversationsMap = new Map();

    for (const msg of allMessages) {
      const otherUser = msg.senderId === myId ? msg.receiver : msg.sender;
      if (!otherUser) continue;

      if (!conversationsMap.has(otherUser.id)) {
        conversationsMap.set(otherUser.id, {
          user: {
            id: otherUser.id,
            name: otherUser.name,
            username: otherUser.username,
            image: otherUser.image,
          },
          lastMessage: {
            id: msg.id,
            content: msg.content,
            senderId: msg.senderId,
            receiverId: msg.receiverId,
            createdAt: msg.createdAt,
          },
        });
      }
    }

    const conversations = Array.from(conversationsMap.values());

    return res
      .status(200)
      .json(new APIResponse('Conversations fetched successfully', 200, conversations));
  } catch (error) {
    console.error('getConversations :: ', error);
    throw error instanceof AppError ? error : new AppError();
  }
}

export async function getChatHistory(req: Request, res: Response) {
  try {
    if (!req.session) {
      throw new AppError('User not logged in', 401);
    }
    const myId = req.session.user.id;
    const { userId: otherId } = req.params;

    if (!otherId) {
      throw new AppError('Other user ID is required', 400);
    }

    // Fetch message history chronologically
    const history = await db.query.message.findMany({
      where: or(
        and(eq(message.senderId, myId), eq(message.receiverId, otherId)),
        and(eq(message.senderId, otherId), eq(message.receiverId, myId))
      ),
      orderBy: [asc(message.createdAt)],
      with: {
        sender: true,
        receiver: true,
        parentMessage: {
          with: {
            sender: true,
          }
        }
      },
    });

    return res
      .status(200)
      .json(new APIResponse('Chat history fetched successfully', 200, history));
  } catch (error) {
    console.error('getChatHistory :: ', error);
    throw error instanceof AppError ? error : new AppError();
  }
}
