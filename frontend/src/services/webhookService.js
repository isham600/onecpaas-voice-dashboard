// Webhook service for triggering and managing webhooks

export const triggerWebhook = async (
  event,
  payload,
  webhooks,
  setWebhookResponses
) => {
  const activeWebhooks = webhooks.filter(
    (wh) => wh.isActive && wh.events.includes(event)
  );

  for (const webhook of activeWebhooks) {
    try {
      const webhookResponse = {
        id: Date.now().toString() + Math.random(),
        webhookId: webhook.id,
        timestamp: new Date(),
        status: "pending",
        payload: {
          event,
          ...payload,
          timestamp: new Date().toISOString(),
        },
      };

      setWebhookResponses((prev) => [webhookResponse, ...prev]);

      // Simulate API call
      const startTime = Date.now();

      // In real implementation, replace with actual fetch call
      // For now, simulate with timeout
      await new Promise((resolve) =>
        setTimeout(resolve, Math.random() * 200 + 100)
      );

      const responseTime = Date.now() - startTime;
      const isSuccess = Math.random() > 0.1; // 90% success rate simulation

      // Update webhook response
      setWebhookResponses((prev) =>
        prev.map((wr) =>
          wr.id === webhookResponse.id
            ? {
                ...wr,
                status: isSuccess ? "success" : "error",
                statusCode: isSuccess ? 200 : 500,
                responseTime,
                response: isSuccess
                  ? { success: true, message: "Webhook processed" }
                  : undefined,
                error: isSuccess ? undefined : "Simulated error",
              }
            : wr
        )
      );

      // In production, this would be the actual implementation:
      /*
      const response = await fetch(webhook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Secret': webhook.secret || '',
          'User-Agent': 'RCS-Inbox-Webhook/1.0'
        },
        body: JSON.stringify(webhookResponse.payload)
      });

      const responseTime = Date.now() - startTime;
      const responseData = await response.json().catch(() => null);

      setWebhookResponses(prev => prev.map(wr =>
        wr.id === webhookResponse.id ? {
          ...wr,
          status: response.ok ? 'success' : 'error',
          statusCode: response.status,
          responseTime,
          response: responseData,
          error: response.ok ? undefined : `HTTP ${response.status}: ${response.statusText}`
        } : wr
      ));
      */
    } catch (error) {
      console.error("Webhook error:", error);
      setWebhookResponses((prev) =>
        prev.map((wr) =>
          wr.webhookId === webhook.id && wr.status === "pending"
            ? {
                ...wr,
                status: "error",
                error: error instanceof Error ? error.message : "Network error",
              }
            : wr
        )
      );
    }
  }
};

export const testWebhook = async (webhook, setWebhookResponses) => {
  await triggerWebhook(
    "test.event",
    {
      test: true,
      webhook_id: webhook.id,
      message: "This is a test webhook from RCS Team Inbox",
    },
    [webhook],
    setWebhookResponses
  );
};
