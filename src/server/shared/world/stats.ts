import { createGauge } from "@/shared/metrics/metrics";

export const subscriptionCount = createGauge({
  name: "redis_subscription_count",
  help: "Number of active Redis subscriptions",
});

export const subscriptionLag = createGauge({
  name: "redis_subscription_lag",
  help: "The number of milliseconds behind the current time the subscription is",
});
