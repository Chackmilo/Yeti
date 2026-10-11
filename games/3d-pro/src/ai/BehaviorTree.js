/**
 * @file BehaviorTree.js
 * @description High-performance, zero-allocation Behavior Tree framework for AI entities.
 * Designed for predictable real-time execution in 60 Hz game loops with runtime explainability.
 */

export const NodeStatus = Object.freeze({
  SUCCESS: 'SUCCESS',
  FAILURE: 'FAILURE',
  RUNNING: 'RUNNING'
});

/**
 * Base abstract node for Behavior Tree.
 */
export class BTNode {
  /**
   * @param {string} name Descriptive identifier for XAI telemetry and debugging.
   */
  constructor(name = 'BTNode') {
    this.name = name;
    this.lastStatus = null;
  }

  /**
   * Evaluates the node given the agent context.
   * @param {Object} context Context state containing blackboard, agent, and world.
   * @returns {string} Value from NodeStatus.
   */
  tick(context) {
    throw new Error(`tick() must be implemented in derived node: ${this.name}`);
  }

  /**
   * Resets internal node execution state.
   */
  reset() {
    this.lastStatus = null;
  }
}

/**
 * Composite node: Selector (Fallback).
 * Evaluates children sequentially until one returns SUCCESS or RUNNING.
 * Fails if all children return FAILURE.
 */
export class Selector extends BTNode {
  /**
   * @param {string} name
   * @param {BTNode[]} children
   */
  constructor(name = 'Selector', children = []) {
    super(name);
    this.children = children;
    this.runningIndex = 0;
  }

  tick(context) {
    const start = this.runningIndex;
    for (let i = start; i < this.children.length; i++) {
      const child = this.children[i];
      const status = child.tick(context);
      this.lastStatus = status;

      if (status === NodeStatus.RUNNING) {
        this.runningIndex = i;
        if (context.telemetry) context.telemetry.recordBTNode(child.name, status);
        return NodeStatus.RUNNING;
      }
      if (status === NodeStatus.SUCCESS) {
        this.runningIndex = 0;
        if (context.telemetry) context.telemetry.recordBTNode(child.name, status);
        return NodeStatus.SUCCESS;
      }
    }
    this.runningIndex = 0;
    this.lastStatus = NodeStatus.FAILURE;
    return NodeStatus.FAILURE;
  }

  reset() {
    super.reset();
    this.runningIndex = 0;
    for (let i = 0; i < this.children.length; i++) {
      this.children[i].reset();
    }
  }
}

/**
 * Composite node: Sequence.
 * Evaluates children sequentially until one returns FAILURE or RUNNING.
 * Succeeds if all children return SUCCESS.
 */
export class Sequence extends BTNode {
  /**
   * @param {string} name
   * @param {BTNode[]} children
   */
  constructor(name = 'Sequence', children = []) {
    super(name);
    this.children = children;
    this.runningIndex = 0;
  }

  tick(context) {
    const start = this.runningIndex;
    for (let i = start; i < this.children.length; i++) {
      const child = this.children[i];
      const status = child.tick(context);
      this.lastStatus = status;

      if (status === NodeStatus.RUNNING) {
        this.runningIndex = i;
        if (context.telemetry) context.telemetry.recordBTNode(child.name, status);
        return NodeStatus.RUNNING;
      }
      if (status === NodeStatus.FAILURE) {
        this.runningIndex = 0;
        if (context.telemetry) context.telemetry.recordBTNode(child.name, status);
        return NodeStatus.FAILURE;
      }
    }
    this.runningIndex = 0;
    this.lastStatus = NodeStatus.SUCCESS;
    return NodeStatus.SUCCESS;
  }

  reset() {
    super.reset();
    this.runningIndex = 0;
    for (let i = 0; i < this.children.length; i++) {
      this.children[i].reset();
    }
  }
}

/**
 * Leaf node: Condition.
 * Evaluates a predicate function returning boolean.
 */
export class Condition extends BTNode {
  /**
   * @param {string} name
   * @param {(context: Object) => boolean} predicate
   */
  constructor(name = 'Condition', predicate) {
    super(name);
    this.predicate = predicate;
  }

  tick(context) {
    const result = Boolean(this.predicate(context));
    this.lastStatus = result ? NodeStatus.SUCCESS : NodeStatus.FAILURE;
    return this.lastStatus;
  }
}

/**
 * Leaf node: Action.
 * Executes an agent action returning a NodeStatus.
 */
export class Action extends BTNode {
  /**
   * @param {string} name
   * @param {(context: Object) => string} actionFn
   */
  constructor(name = 'Action', actionFn) {
    super(name);
    this.actionFn = actionFn;
  }

  tick(context) {
    this.lastStatus = this.actionFn(context);
    return this.lastStatus;
  }
}

/**
 * Decorator: Inverter.
 * Inverts SUCCESS -> FAILURE and FAILURE -> SUCCESS. RUNNING is preserved.
 */
export class Inverter extends BTNode {
  /**
   * @param {string} name
   * @param {BTNode} child
   */
  constructor(name = 'Inverter', child) {
    super(name);
    this.child = child;
  }

  tick(context) {
    const status = this.child.tick(context);
    if (status === NodeStatus.SUCCESS) {
      this.lastStatus = NodeStatus.FAILURE;
      return NodeStatus.FAILURE;
    }
    if (status === NodeStatus.FAILURE) {
      this.lastStatus = NodeStatus.SUCCESS;
      return NodeStatus.SUCCESS;
    }
    this.lastStatus = NodeStatus.RUNNING;
    return NodeStatus.RUNNING;
  }

  reset() {
    super.reset();
    this.child.reset();
  }
}
