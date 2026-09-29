import { Injectable } from '@nestjs/common';
import { DatabaseService } from './database.service';
import {
  Prisma,
  UserInteraction,
  ServerAction,
  UpvoteInteraction,
  DiscussionRoot,
  Discussion,
  UpvoteDiscussion,
} from '@prisma/client';

export type UserInteractionWithAction = Prisma.UserInteractionGetPayload<{
  include: { serverActions: true };
}>;
export type DiscussionWithDiscussionRoot = Prisma.DiscussionGetPayload<{
  include: { root: true };
}>;

@Injectable()
export class UserInteractionService {
  constructor(private database: DatabaseService) {}

  async userInteraction(
    userInteractionWhereUniqueInput: Prisma.UserInteractionWhereUniqueInput,
  ): Promise<UserInteraction | null> {
    return this.database.userInteraction.findUnique({
      where: userInteractionWhereUniqueInput,
    });
  }

  async userInteractions(params: {
    skip?: number;
    take?: number;
    cursor?: Prisma.UserInteractionWhereUniqueInput;
    where?: Prisma.UserInteractionWhereInput;
    orderBy?: Prisma.UserInteractionOrderByWithRelationInput;
  }): Promise<UserInteraction[]> {
    const { skip, take, cursor, where, orderBy } = params;
    return this.database.userInteraction.findMany({
      skip,
      take,
      cursor,
      where,
      orderBy,
    });
  }

  async findMany<T extends Prisma.UserInteractionFindManyArgs>(
    args: Prisma.SelectSubset<T, Prisma.UserInteractionFindManyArgs>,
  ) {
    return this.database.userInteraction.findMany<T>(args);
  }

  async userInteractionsWithServerActions(params: {
    skip?: number;
    take?: number;
    cursor?: Prisma.UserInteractionWhereUniqueInput;
    where?: Prisma.UserInteractionWhereInput;
    // Accepts an array so callers can add a tiebreak column. Ordering by
    // timestamp alone is not deterministic — two interactions can share a
    // millisecond — and prompt replay depends on a stable order.
    orderBy?:
      | Prisma.UserInteractionOrderByWithRelationInput
      | Prisma.UserInteractionOrderByWithRelationInput[];
    // include?: Prisma.UserInteractionInclude;
  }): Promise<UserInteractionWithAction[]> {
    const { skip, take, cursor, where, orderBy } = params;
    return this.findMany({
      skip,
      take,
      cursor,
      where,
      orderBy,
      // Order steps chronologically so a multi-step agent turn's narration
      // replays in sequence in chat history.
      include: { serverActions: { orderBy: { timestamp: 'asc' } } },
    });
  }

  async createUserInteraction(
    data:
      | Prisma.UserInteractionCreateInput
      | Prisma.UserInteractionUncheckedCreateInput,
  ): Promise<UserInteraction> {
    return this.database.userInteraction.create({
      data,
    });
  }

  async updateUserInteraction(params: {
    where: Prisma.UserInteractionWhereUniqueInput;
    data:
      | Prisma.UserInteractionUpdateInput
      | Prisma.UserInteractionUncheckedUpdateInput;
  }): Promise<UserInteraction> {
    const { where, data } = params;
    return this.database.userInteraction.update({
      data,
      where,
    });
  }

  async createServerAction(
    data:
      Prisma.ServerActionCreateInput | Prisma.ServerActionUncheckedCreateInput,
  ): Promise<ServerAction> {
    return this.database.serverAction.create({
      data,
    });
  }

  async upvoteInteraction(
    upvoteInteractionWhereUniqueInput: Prisma.UpvoteInteractionWhereUniqueInput,
  ): Promise<UpvoteInteraction | null> {
    return this.database.upvoteInteraction.findUnique({
      where: upvoteInteractionWhereUniqueInput,
    });
  }

  async createUpvoteInteraction(
    data:
      | Prisma.UpvoteInteractionCreateInput
      | Prisma.UpvoteInteractionUncheckedCreateInput,
  ): Promise<UpvoteInteraction> {
    return this.database.upvoteInteraction.create({
      data,
    });
  }

  async deleteUpvoteInteraction(
    upvoteInteractionWhereUniqueInput: Prisma.UpvoteInteractionWhereUniqueInput,
  ): Promise<UpvoteInteraction> {
    return this.database.upvoteInteraction.delete({
      where: upvoteInteractionWhereUniqueInput,
    });
  }

  async createDiscussionRoot(
    data:
      | Prisma.DiscussionRootCreateInput
      | Prisma.DiscussionRootUncheckedCreateInput,
  ): Promise<DiscussionRoot> {
    return this.database.discussionRoot.create({
      data,
    });
  }
  async discussionRoot(
    discussionRootWhereUniqueInput: Prisma.DiscussionRootWhereUniqueInput,
  ): Promise<DiscussionRoot | null> {
    return this.database.discussionRoot.findUnique({
      where: discussionRootWhereUniqueInput,
    });
  }

  async deleteDiscussionRoot(
    discussionRootWhereUniqueInput: Prisma.DiscussionRootWhereUniqueInput,
  ): Promise<DiscussionRoot> {
    return this.database.discussionRoot.delete({
      where: discussionRootWhereUniqueInput,
    });
  }

  async updateDiscussionRoot(params: {
    where: Prisma.DiscussionRootWhereUniqueInput;
    data:
      | Prisma.DiscussionRootUpdateInput
      | Prisma.DiscussionRootUncheckedUpdateInput;
  }): Promise<DiscussionRoot> {
    const { where, data } = params;
    return this.database.discussionRoot.update({
      data,
      where,
    });
  }

  async createDiscussion(
    data: Prisma.DiscussionCreateInput | Prisma.DiscussionUncheckedCreateInput,
  ): Promise<Discussion> {
    return this.database.discussion.create({
      data,
    });
  }

  async discussion(
    discussionWhereUniqueInput: Prisma.DiscussionWhereUniqueInput,
  ): Promise<Discussion | null> {
    return this.database.discussion.findUnique({
      where: discussionWhereUniqueInput,
    });
  }

  async findUnique<T extends Prisma.DiscussionFindUniqueArgs>(
    args: Prisma.SelectSubset<T, Prisma.DiscussionFindUniqueArgs>,
  ) {
    return this.database.discussion.findUnique<T>(args);
  }

  async discussionWithDiscussionRoot(params: {
    where: Prisma.DiscussionWhereUniqueInput;
  }): Promise<DiscussionWithDiscussionRoot | null> {
    const { where } = params;
    return this.database.discussion.findUnique({
      where: where,
      include: { root: true },
    });
  }

  async upvoteDiscussion(
    upvoteDiscussionWhereUniqueInput: Prisma.UpvoteDiscussionWhereUniqueInput,
  ): Promise<UpvoteDiscussion | null> {
    return this.database.upvoteDiscussion.findUnique({
      where: upvoteDiscussionWhereUniqueInput,
    });
  }

  async updateDiscussion(params: {
    where: Prisma.DiscussionWhereUniqueInput;
    data: Prisma.DiscussionUpdateInput | Prisma.DiscussionUncheckedUpdateInput;
  }): Promise<Discussion> {
    const { where, data } = params;
    return this.database.discussion.update({
      data,
      where,
    });
  }

  async createUpvoteDiscussion(
    data:
      | Prisma.UpvoteDiscussionCreateInput
      | Prisma.UpvoteDiscussionUncheckedCreateInput,
  ): Promise<UpvoteDiscussion> {
    return this.database.upvoteDiscussion.create({
      data,
    });
  }

  async deleteUpvoteDiscussion(
    upvoteDiscussionWhereUniqueInput: Prisma.UpvoteDiscussionWhereUniqueInput,
  ): Promise<UpvoteDiscussion> {
    return this.database.upvoteDiscussion.delete({
      where: upvoteDiscussionWhereUniqueInput,
    });
  }
}
