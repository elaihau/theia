/*
 * Copyright (C) 2017 TypeFox and others.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 */

import { injectable, inject } from 'inversify';
import { Tree, TreeNode } from './tree';
import { StructuredSelection } from '../../common/selection';
import { Event, Emitter, Disposable, SelectionProvider } from '../../common';

/**
 * Representation of a tree selection. The selected nodes can be accessed in inverse-chronological order.
 * The first item is the most recently selected node then come the others (if any).
 */
export interface TreeSelection extends StructuredSelection<SelectableTreeNode> {
}

/**
 * The tree selection service.
 */
export const TreeSelectionService = Symbol("TreeSelectionService");
export interface TreeSelectionService extends Disposable, SelectionProvider<TreeSelection> {

    /**
     * The tree selection, representing the selected nodes from the tree. If nothing is selected, the
     * result will be empty.
     */
    readonly selectedNodes: TreeSelection;

    /**
     * Emitted when the selection has changed in the tree.
     */
    readonly onSelectionChanged: Event<TreeSelection>;

    /**
     * Selects the given `node` in the tree. Has no effect if the `node` is invalid or already selected.
     */
    selectNode(node: SelectableTreeNode, props?: TreeSelectionService.SelectionProps): void;

    /**
     * Removes the selection from the given `node`. If the `node` is undefined, removes all the selections from the tree.
     * Has no effect, if the `node` is invalid or not selected.
     */
    unselectNode(node: SelectableTreeNode | undefined): void;
}

export namespace TreeSelectionService {

    /**
     * Selection options.
     */
    export interface SelectionProps {

        /**
         * The selection type. If not given, defaults to `SINGLE` selection type.
         */
        readonly selectionType?: StructuredSelection.SelectionType;
    }

}

/**
 * The selectable tree node.
 */
export interface SelectableTreeNode extends TreeNode {

    /**
     * Test whether this node is selected.
     */
    selected: boolean;
}

export namespace SelectableTreeNode {

    export function is(node: TreeNode | undefined): node is SelectableTreeNode {
        return !!node && 'selected' in node;
    }

    export function isSelected(node: TreeNode | undefined): node is SelectableTreeNode {
        return is(node) && node.selected;
    }

    export function isVisible(node: TreeNode | undefined): node is SelectableTreeNode {
        return is(node) && TreeNode.isVisible(node);
    }

    export function getVisibleParent(node: TreeNode | undefined): SelectableTreeNode | undefined {
        if (node) {
            if (isVisible(node.parent)) {
                return node.parent;
            }
            return getVisibleParent(node.parent);
        }
    }
}

@injectable()
export class TreeSelectionServiceImpl implements TreeSelectionService {

    @inject(Tree)
    protected readonly tree: Tree;
    protected readonly _selectedNodes: SelectableTreeNode[] = [];
    protected readonly onSelectionChangedEmitter = new Emitter<TreeSelection>();

    dispose() {
        this.onSelectionChangedEmitter.dispose();
    }

    get selectedNodes(): TreeSelection {
        return this._selectedNodes.slice();
    }

    get onSelectionChanged(): Event<TreeSelection> {
        return this.onSelectionChangedEmitter.event;
    }

    protected fireSelectionChanged(): void {
        this.onSelectionChangedEmitter.fire(this._selectedNodes.slice());
    }

    selectNode(raw: SelectableTreeNode, props?: TreeSelectionService.SelectionProps): void {
        const node = this.validateNode(raw);
        if (SelectableTreeNode.is(node)) {
            this.doSelectNode(node, props);
        }
    }

    protected doSelectNode(node: SelectableTreeNode, props?: TreeSelectionService.SelectionProps): void {
        // Shortcut. Nothing is selected yet. Select the node and we are done.
        if (this._selectedNodes.length === 0) {
            node.selected = true;
            this._selectedNodes.unshift(node);
            this.fireSelectionChanged();
            return;
        }

        const multi = StructuredSelection.SelectionType.isMulti((props || {}).selectionType);
        const index = this._selectedNodes.indexOf(node);
        let changed = false;

        if (multi) {
            // The node is not yet selected;
            if (index === -1) {
                node.selected = true;
                this._selectedNodes.unshift(node);
                changed = true;
            } else {
                // length === 0 => We already covered this case. Nothing to do.
                // length === 1 => The node we want to select is already selected. Nothing to do.
                // length !== 1 => We need to unlink the selected node and put it into the start position.
                if (this._selectedNodes.length !== 1) {
                    node.selected = true;
                    this._selectedNodes.splice(index, 1);
                    this._selectedNodes.unshift(node);
                    changed = true;
                }
            }
        } else if (this._selectedNodes.length !== 1 || index === -1) {
            this.clearSelections();
            node.selected = true;
            this._selectedNodes.unshift(node);
            changed = true;
        }

        if (changed) {
            this.fireSelectionChanged();
        }
    }

    unselectNode(raw: SelectableTreeNode | undefined): void {
        if (raw === undefined) {
            this.doUnselectNode(undefined);
        } else {
            const node = this.tree.validateNode(raw);
            if (SelectableTreeNode.is(node)) {
                this.doUnselectNode(node);
            }
        }
    }

    protected doUnselectNode(node: SelectableTreeNode | undefined): void {
        if (node === undefined) {
            this._selectedNodes.forEach(n => n.selected = false);
            this._selectedNodes.length = 0;
            this.fireSelectionChanged();
        } else {
            const index = this._selectedNodes.indexOf(node);
            if (index !== -1) {
                node.selected = false;
                this._selectedNodes.splice(index, 1);
                this.fireSelectionChanged();
            }
        }
    }

    protected validateNode(node: TreeNode | undefined): TreeNode | undefined {
        return this.tree.validateNode(node);
    }

    protected clearSelections() {
        this._selectedNodes.forEach(n => n.selected = false);
        this._selectedNodes.length = 0;
    }

}
