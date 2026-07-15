import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, PutCommand } from "@aws-sdk/lib-dynamodb";
import type { RecentEvent, UserState } from "./types";

export const TABLE_NAME = "StockMateUserState";
export const DEMO_USER_ID = "demo_user";
const MAX_RECENT_EVENTS = 5;

export interface DocClientLike {
  send(command: GetCommand | PutCommand): Promise<any>;
}

export function createDocClient(region: string): DocClientLike {
  const client = new DynamoDBClient({ region });
  return DynamoDBDocumentClient.from(client);
}

function emptyState(): UserState {
  return {
    userId: DEMO_USER_ID,
    currentDate: "",
    visitCount: 0,
    mainIndex: 0,
    summary: "",
    recentEvents: [],
    updatedAt: new Date().toISOString(),
  };
}

export async function loadUserState(doc: DocClientLike): Promise<UserState> {
  const result = await doc.send(
    new GetCommand({ TableName: TABLE_NAME, Key: { user_id: DEMO_USER_ID } })
  );
  if (!result.Item) return emptyState();
  return {
    userId: result.Item.user_id,
    currentDate: result.Item.current_date,
    visitCount: result.Item.visit_count,
    mainIndex: result.Item.main_index,
    summary: result.Item.summary,
    recentEvents: result.Item.recent_events,
    updatedAt: result.Item.updated_at,
  };
}

export async function saveUserState(doc: DocClientLike, state: UserState): Promise<void> {
  await doc.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        user_id: state.userId,
        current_date: state.currentDate,
        visit_count: state.visitCount,
        main_index: state.mainIndex,
        summary: state.summary,
        recent_events: state.recentEvents,
        updated_at: state.updatedAt,
      },
    })
  );
}

export function appendRecentEvent(state: UserState, event: RecentEvent): UserState {
  const recentEvents = [...state.recentEvents, event];
  while (recentEvents.length > MAX_RECENT_EVENTS) {
    recentEvents.shift();
  }
  return { ...state, recentEvents, updatedAt: new Date().toISOString() };
}
