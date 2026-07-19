import * as p from 'drizzle-orm/pg-core';
import { user } from '../auth-schema.ts';
import { relations } from 'drizzle-orm';

export const post = p.pgTable('post', {
  id: p.serial('id').primaryKey(),
  userId: p
    .text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  parentPostId: p.integer('parent_post_id'),
  quotedPostId: p.integer('quoted_post_id'),
  content: p.text('content').notNull(),
  visibility: p
    .text('visibility', { enum: ['public', 'followers'] })
    .default('public'),
  createdAt: p.timestamp('created_at').defaultNow().notNull(),
  updatedAt: p
    .timestamp('updated_at')
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
});

export const repost = p.pgTable(
  'repost',
  {
    id: p.serial('id').primaryKey(),
    createdAt: p.timestamp('created_at').defaultNow().notNull(),
    updatedAt: p
      .timestamp('updated_at')
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    userId: p
      .text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    postId: p
      .integer('post_id')
      .notNull()
      .references(() => post.id, { onDelete: 'cascade' }),
  },
  (t) => [p.unique().on(t.userId, t.postId)],
);

export const bookmark = p.pgTable(
  'bookmark',
  {
    id: p.serial('id').primaryKey(),
    createdAt: p.timestamp('created_at').defaultNow().notNull(),
    updatedAt: p
      .timestamp('updated_at')
      .$onUpdate(() => new Date())
      .notNull(),
    userId: p
      .text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    postId: p
      .integer('post_id')
      .notNull()
      .references(() => post.id, { onDelete: 'cascade' }),
  },
  (t) => [p.unique().on(t.userId, t.postId)],
);

export const like = p.pgTable('like', {
  id: p.serial('id').notNull().primaryKey(),
  userId: p
    .text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  postId: p
    .integer('post_id')
    .notNull()
    .references(() => post.id, { onDelete: 'cascade' }),
  createdAt: p.timestamp('created_at').notNull().defaultNow(),
  updatedAt: p
    .timestamp('updated_at')
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
});

export const media = p.pgTable('media', {
  id: p.serial('id').primaryKey(),
  type: p.text('type', { enum: ['auto', 'image', 'video', 'raw'] }),
  url: p.text('url').notNull(),
  thumbnailUrl: p.text('thumbnail_url'),
  postId: p
    .integer('post_id')
    .notNull()
    .references(() => post.id, { onDelete: 'cascade' }),
  createdAt: p.timestamp('created_at').defaultNow().notNull(),
  updatedAt: p
    .timestamp('updated_at')
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
});

export const follow = p.pgTable(
  'follow',
  {
    id: p.serial('id').primaryKey(),
    followerId: p
      .text('followerId')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    followingId: p
      .text('followingId')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    createdAt: p.timestamp('created_at').defaultNow().notNull(),
    updatedAt: p
      .timestamp('updated_at')
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (t) => [p.unique().on(t.followerId, t.followingId)],
);

// 1. Post Relations (Connects posts to media, likes, and itself for comments)
export const postRelations = relations(post, ({ one, many }) => ({
  media: many(media),
  likes: many(like),

  comments: many(post, { relationName: 'post_comments' }),
  parentPost: one(post, {
    fields: [post.parentPostId],
    references: [post.id],
    relationName: 'post_comments',
  }),

  quotePosts: many(post, { relationName: 'post_quotes' }),
  quotedPost: one(post, {
    fields: [post.quotedPostId],
    references: [post.id],
    relationName: 'post_quotes',
  }),

  reposts: many(repost),
  bookmarks: many(bookmark),

  author: one(user, {
    fields: [post.userId],
    references: [user.id],
  }),
}));

export const repostRelations = relations(repost, ({ one }) => ({
  post: one(post, {
    fields: [repost.postId],
    references: [post.id],
  }),
  user: one(user, {
    fields: [repost.userId],
    references: [user.id],
  }),
}));

export const bookmarkRelations = relations(bookmark, ({ one }) => ({
  post: one(post, {
    fields: [bookmark.postId],
    references: [post.id],
  }),
  user: one(user, {
    fields: [bookmark.userId],
    references: [user.id],
  }),
}));

// 2. Media Relations
export const mediaRelations = relations(media, ({ one }) => ({
  post: one(post, {
    fields: [media.postId],
    references: [post.id],
  }),
}));

// 3. Like Relations
export const likeRelations = relations(like, ({ one }) => ({
  post: one(post, {
    fields: [like.postId],
    references: [post.id],
  }),
  user: one(user, {
    fields: [like.userId],
    references: [user.id],
  }),
}));

export const message = p.pgTable('message', {
  id: p.serial('id').primaryKey(),
  senderId: p
    .text('sender_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  receiverId: p
    .text('receiver_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  content: p.text('content').notNull(),
  parentMessageId: p.integer('parent_message_id'),
  createdAt: p.timestamp('created_at').defaultNow().notNull(),
  updatedAt: p
    .timestamp('updated_at')
    .$onUpdate(() => new Date())
    .notNull(),
});

export const messageRelations = relations(message, ({ one }) => ({
  sender: one(user, {
    fields: [message.senderId],
    references: [user.id],
  }),
  receiver: one(user, {
    fields: [message.receiverId],
    references: [user.id],
  }),
  parentMessage: one(message, {
    fields: [message.parentMessageId],
    references: [message.id],
  }),
}));

