const streamsByUser = new Map();

export function addNotificationStream(userId, res) {
  const key = String(userId);
  if (!streamsByUser.has(key)) {
    streamsByUser.set(key, new Set());
  }

  streamsByUser.get(key).add(res);
  res.on("close", () => removeNotificationStream(userId, res));
}

export function broadcastNotification(userId, notification) {
  const streams = streamsByUser.get(String(userId));
  if (!streams) return;

  const payload = `event: notification\ndata: ${JSON.stringify(notification)}\n\n`;
  for (const stream of streams) {
    stream.write(payload);
  }
}

function removeNotificationStream(userId, res) {
  const key = String(userId);
  const streams = streamsByUser.get(key);
  if (!streams) return;

  streams.delete(res);
  if (streams.size === 0) {
    streamsByUser.delete(key);
  }
}
