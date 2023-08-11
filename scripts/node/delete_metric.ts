import * as monitoring from "@google-cloud/monitoring";

export async function deleteMetric(name: string) {
  const client = new monitoring.MetricServiceClient();

  const request = {
    name: client.projectMetricDescriptorPath("zones-cloud", name),
  };
  // Deletes a metric descriptor
  const [result] = await client.deleteMetricDescriptor(request);
  console.log(`Deleted ${name}`, result);
}

for (const metric of process.argv.slice(2)) {
  void deleteMetric(metric);
}
