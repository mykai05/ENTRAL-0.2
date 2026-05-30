import { type CommandOSState, type CommandNodeLike } from "./command-os-store";

export type CommandRecoverySummary = {
  advice: string[];
  hasRecoveryMarshal: boolean;
  marshalId: string | null;
  marshalName: string | null;
  recoveredEntityCount: number;
  recoveredGeneralCount: number;
  repairedTaskCount: number;
};

function descendantIdsFor<TNode extends CommandNodeLike>(state: CommandOSState<TNode>, rootId: string) {
  const descendants: string[] = [];
  const stack = state.nodes.filter((node) => node.parentId === rootId).map((node) => node.id);

  while (stack.length > 0) {
    const id = stack.pop() as string;
    descendants.push(id);
    stack.push(...state.nodes.filter((node) => node.parentId === id).map((node) => node.id));
  }

  return descendants;
}

function taskHasRecoveryHistory(history: string[]) {
  return history.some((entry) => /recovered|cleaned task references|interrupted/i.test(entry));
}

export function getCommandRecoverySummary<TNode extends CommandNodeLike>(state: CommandOSState<TNode>): CommandRecoverySummary {
  const recoveryMarshal = state.nodes.find((node) => (
    node.commandType === "marshal"
    && (
      node.id === "primary-marshal"
      || /recovery|legacy hierarchy migration/i.test([...node.logs, ...node.memory.notes].join(" "))
    )
  )) ?? null;

  if (!recoveryMarshal) {
    return {
      advice: [],
      hasRecoveryMarshal: false,
      marshalId: null,
      marshalName: null,
      recoveredEntityCount: 0,
      recoveredGeneralCount: 0,
      repairedTaskCount: state.tasks.filter((task) => taskHasRecoveryHistory(task.history)).length
    };
  }

  const recoveredIds = new Set(descendantIdsFor(state, recoveryMarshal.id));
  const recoveredNodes = state.nodes.filter((node) => recoveredIds.has(node.id));
  const repairedTaskCount = state.tasks.filter((task) => (
    taskHasRecoveryHistory(task.history)
    || task.delegationPath.some((id) => id === recoveryMarshal.id || recoveredIds.has(id))
  )).length;

  return {
    advice: [
      "Review the recovered Marshal before assigning new work.",
      "Confirm each recovered General belongs in this theater.",
      "Move or archive anything that does not match the current command structure."
    ],
    hasRecoveryMarshal: true,
    marshalId: recoveryMarshal.id,
    marshalName: recoveryMarshal.name,
    recoveredEntityCount: recoveredNodes.length,
    recoveredGeneralCount: recoveredNodes.filter((node) => node.commandType === "general").length,
    repairedTaskCount
  };
}
