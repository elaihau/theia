/*
 * Copyright (C) 2017 TypeFox and others.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 */

import { TreeNode, CompositeTreeNode } from "./tree";
import { ExpandableTreeNode } from "./tree-expansion";

export interface TreeNodeIterator extends Iterator<TreeNode | undefined> {
}

export namespace TreeNodeIterator {
    export interface IOptions {
        readonly pruneCollapsed: boolean
    }
    export const DEFAULT_OPTIONS: IOptions = {
        pruneCollapsed: false
    };
}

export abstract class AbstractTreeNodeIterator implements TreeNodeIterator {
    constructor(protected node: TreeNode | undefined,
        protected readonly options = TreeNodeIterator.DEFAULT_OPTIONS) {
    }

    next(): IteratorResult<TreeNode | undefined> {
        if (!this.node) {
            return {
                value: undefined,
                done: true,
            };
        }
        this.node = this.doNext(this.node);
        return {
            value: this.node,
            done: false
        };
    }

    protected abstract doNext(node: TreeNode): TreeNode | undefined;

    protected hasChildren(node: TreeNode | undefined): node is CompositeTreeNode {
        if (!CompositeTreeNode.is(node)) {
            return false;
        }
        if (node.children.length === 0) {
            return false;
        }
        if (this.options.pruneCollapsed) {
            return ExpandableTreeNode.isExpanded(node);
        }
        return true;
    }
}

export class ForwardTreeNodeIterator extends AbstractTreeNodeIterator {

    protected doNext(node: TreeNode): TreeNode | undefined {
        return this.findFirstChild(node) || this.findNextSibling(node);
    }

    protected findFirstChild(node: TreeNode | undefined): TreeNode | undefined {
        return this.hasChildren(node) ? CompositeTreeNode.getFirstChild(node) : undefined;
    }

    protected findNextSibling(node: TreeNode | undefined): TreeNode | undefined {
        if (!node) {
            return undefined;
        }
        const nextSibling = TreeNode.getNextSibling(node);
        if (nextSibling) {
            return nextSibling;
        }
        return this.findNextSibling(node.parent);
    }

}

export class BackwardTreeNodeIterator extends AbstractTreeNodeIterator {

    protected doNext(node: TreeNode): TreeNode | undefined {
        const prevSibling = TreeNode.getPrevSibling(node);
        const lastChild = this.findLastChild(prevSibling);
        return lastChild || node.parent;
    }

    protected findLastChild(node: TreeNode | undefined): TreeNode | undefined {
        if (!this.hasChildren(node)) {
            return node;
        }
        const lastChild = CompositeTreeNode.getLastChild(node);
        return this.findLastChild(lastChild);
    }

}
