export async function sendSlackNotification(text: string): Promise<boolean> {
  const token = process.env.SLACK_TOKEN;
  const channel = process.env.SLACK_CHANNEL || '#general';

  if (!token || token.trim() === '') {
    console.log('[Slack] SLACK_TOKEN is not configured. Skipping Slack notification.');
    return false;
  }

  try {
    const response = await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json; charset=utf-8',
      },
      body: JSON.stringify({
        channel: channel,
        text: text,
      }),
    });

    const data = await response.json();
    if (response.ok && data.ok) {
      console.log(`[Slack] Message sent successfully to ${channel}.`);
      return true;
    } else {
      console.error('[Slack] API error:', data.error || data);
      return false;
    }
  } catch (err) {
    console.error('[Slack] Network error sending to Slack:', err);
    return false;
  }
}
