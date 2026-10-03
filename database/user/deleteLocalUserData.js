import { getLocalDatabase } from "../localDatabase.js";

export async function deleteLocalUserData(userId) {
  if (!userId) {
    throw new Error("Missing user ID.");
  }

  const database = await getLocalDatabase();

  await database.withExclusiveTransactionAsync(async (transaction) => {
    await transaction.runAsync("DELETE FROM sync_queue WHERE user_id = ?", [
      userId,
    ]);

    await transaction.runAsync(
      "DELETE FROM child_preferences_local WHERE user_id = ?",
      [userId],
    );

    await transaction.runAsync("DELETE FROM children_local WHERE user_id = ?", [
      userId,
    ]);

    await transaction.runAsync(
      "DELETE FROM child_relationships_local WHERE user_id = ?",
      [userId],
    );

    await transaction.runAsync(
      "DELETE FROM user_notification_preferences_local WHERE user_id = ?",
      [userId],
    );

    await transaction.runAsync(
      "DELETE FROM user_preferences_local WHERE user_id = ?",
      [userId],
    );
  });
}
