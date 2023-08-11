import { log } from "@/shared/logging";
import { Cval, makeCvalHook } from "@/shared/util/cvals";

export interface GpuTimer {
  // The GPU will process the commands issued to it in the render function
  // asynchronously, so the results won't be available right away and therefore
  // a promise is returned. It will contain the GPU time spent processing the
  // commands, in nanoseconds.
  measure(render: () => void): Promise<number>;
}

export function makeGpuTimer(
  context: WebGLRenderingContext | WebGL2RenderingContext
): GpuTimer | undefined {
  // We could also use EXT_disjoint_timer_query if we run into WebGL1 contexts
  // Note that this doesn't take into account any other work the GPU
  // may be doing that reduces GPU-based framerate
  if (context instanceof WebGL2RenderingContext) {
    const disjointTimerQueryExt = context.getExtension(
      "EXT_disjoint_timer_query_webgl2"
    );
    if (disjointTimerQueryExt) {
      return new GpuTimerDisjointTimerQuery2(context, disjointTimerQueryExt);
    } else {
      log.warn("EXT_disjoint_timer_query_webgl2 not supported");
    }
  }
  return undefined;
}

class GpuTimerDisjointTimerQuery2 implements GpuTimer {
  private activeQueries: {
    query: WebGLQuery;
    resolve: (timeElapsedNs: number) => void;
  }[] = [];

  numActiveQueriesHighwater: Cval<number>;

  constructor(private context: WebGL2RenderingContext, private ext: any) {
    makeCvalHook({
      path: ["renderer", "profiling", "gpuTimer", "numActiveQueries"],
      help: "Number of active GPU timing queries pending.",
      collect: () => this.activeQueries.length,
    });
    this.numActiveQueriesHighwater = new Cval<number>({
      path: ["renderer", "profiling", "gpuTimer", "numActiveQueriesHighwater"],
      help: "High water mark for number of active GPU timing queries pending.",
      initialValue: 0,
    });
  }

  measure(render: () => void): Promise<number> {
    this.checkIfActiveQueriesCompleted();

    const query = this.context.createQuery() ?? undefined;
    if (query) {
      this.context.beginQuery(this.ext.TIME_ELAPSED_EXT, query);
    }

    render();

    if (query) {
      this.context.endQuery(this.ext.TIME_ELAPSED_EXT);
      return new Promise((resolve) => {
        this.activeQueries.push({ query, resolve });
        this.numActiveQueriesHighwater.value = Math.max(
          this.numActiveQueriesHighwater.value,
          this.activeQueries.length
        );
      });
    } else {
      return Promise.reject(new Error("Failed to create new query."));
    }
  }

  private checkIfActiveQueriesCompleted() {
    const remainingQueries = [];

    for (const query of this.activeQueries) {
      if (
        this.context.getQueryParameter(
          query.query,
          this.context.QUERY_RESULT_AVAILABLE
        )
      ) {
        const timeElapsedNs = this.context.getQueryParameter(
          query.query,
          this.context.QUERY_RESULT
        );

        query.resolve(timeElapsedNs);

        this.context.deleteQuery(query.query);
      } else {
        remainingQueries.push(query);
      }
    }

    this.activeQueries = remainingQueries;
  }
}
