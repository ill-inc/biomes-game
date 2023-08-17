---
sidebar_position: 6
---

# Hosting Biomes

### Overview

_Note: Hosting Biomes is an involved process and requires a significant amount compute and hardware resources._

Biomes is hosted as a set of services within a [Kubernetes](https://kubernetes.io/) cluster, on [Google Cloud Platform (GCP)](https://cloud.google.com/). The specifics of the cluster's deployment can be found in [deploy/k8](https://github.com/ill-inc/biomes-game/blob/main/deploy/k8), including the number of replicas, and memory
requirements of each service.

We currently do not have comprehensive documentation on self-hosting Biomes, but if you have experience with GCP and Kubernetes the setup should look familiar.

### Profiling

We use [Prometheus](https://prometheus.io/) to collect metrics, and [Grafana](https://grafana.com/) for visualizations. Kubernetes configuration for both can be found in [deploy/k8/monitoring](https://github.com/ill-inc/biomes-game/blob/main/deploy/k8/monitoring).
