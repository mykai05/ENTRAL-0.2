import {
  executeGraphLayoutWorkerRequest,
  type GraphLayoutWorkerRequest,
  type GraphLayoutWorkerResponse
} from "../lib/graph-layout-worker-protocol";

type CanonicalGraphWorkerScope = {
  onmessage:
    | ((event: MessageEvent<GraphLayoutWorkerRequest>) => void)
    | null;
  postMessage(message: GraphLayoutWorkerResponse): void;
};

const workerScope = globalThis as unknown as CanonicalGraphWorkerScope;

workerScope.onmessage = (event) => {
  workerScope.postMessage(executeGraphLayoutWorkerRequest(event.data));
};
