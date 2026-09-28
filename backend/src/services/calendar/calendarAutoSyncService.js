import {
  syncGoogleCalendarForUser,
} from "./googleCalendarSyncService.js";


const pendingSyncs = new Map();


/**
 * Queue a Google Calendar sync for one Trackr user.
 *
 * The sync happens after the Trackr database change succeeds.
 * We intentionally do not make the user's normal create/update/delete
 * request fail just because Google Calendar is temporarily unavailable.
 *
 * A short debounce prevents several quick changes from launching
 * overlapping full syncs.
 */
export function queueGoogleCalendarSync(
  userId,
  delayMs = 350,
) {
  const id =
    Number(userId);

  if (
    !Number.isInteger(id) ||
    id < 1
  ) {
    return;
  }


  const existing =
    pendingSyncs.get(id);

  if (existing) {
    clearTimeout(existing);
  }


  const timer =
    setTimeout(
      async () => {
        pendingSyncs.delete(id);

        try {
          await syncGoogleCalendarForUser(
            id,
          );
        } catch (error) {

          // A user who has never connected Google Calendar
          // should still be able to use Trackr normally.
          if (
            error?.statusCode ===
            409
          ) {
            return;
          }

          console.error(
            `Automatic Google Calendar sync failed for user ${id}:`,
            error,
          );
        }
      },
      delayMs,
    );


  pendingSyncs.set(
    id,
    timer,
  );
}