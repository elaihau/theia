/*
 * Copyright (C) 2017 TypeFox and others.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 */

import { injectable, inject } from "inversify";
import { Event, Emitter, Disposable, SelectionProvider } from "../../common";
import { ITree, ITreeNode } from "./tree";
import { ReadonlyArrayLike } from '../../common/types';

/**
 * Representation of a tree selection. Encapsulates zero to many selected tree nodes.
 * The selected nodes can be accessed in inverse-chronological order. The first item
 * is the most recently selected node then come the others (if any). When nothing is selected,
 * the tree selection is empty, accessing any item will result in `undefined`.
 */
export interface TreeSelection extends ReadonlyArrayLike<ISelectableTreeNode>, Iterable<Readonly<ISelectableTreeNode>> {
    // TODO readonly first: Readonly<ISelectableTreeNode> | undefined;
}

export namespace TreeSelection {

    /**
     * `true` if the argument is an empty selection. Otherwise, `false`.
     */
    export function isEmpty(selection: TreeSelection): boolean {
        return selection.length === 0;
    }

    /**
     * `true` if the argument represents exactly one selected tree node. Otherwise, `false`.
     */
    export function isSingle(selection: TreeSelection): boolean {
        return selection.length === 1;
    }

}

/**
 * The tree selection service.
 */
export const ITreeSelectionService = Symbol("ITreeSelectionService");
export interface ITreeSelectionService extends Disposable, SelectionProvider<TreeSelection> {

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
    selectNode(node: ISelectableTreeNode, options?: ITreeSelectionService.Options): void;

    /**
     * Removes the selection from the give `node`. If the `node` is undefined, removes all the selections from the tree.
     * Has no effect, if the `node` is invalid or not selected.
     */
    unselectNode(node: ISelectableTreeNode | undefined): void;
}

export namespace ITreeSelectionService {

    /**
     * Selection options.
     */
    export interface Options {

        /**
         * `true` if multi selection is supported. Otherwise, `false`. Defaults to `false`.
         */
        readonly multi?: boolean;
    }

}

/**
 * The selectable tree node.
 */
export interface ISelectableTreeNode extends ITreeNode {

    /**
     * Test whether this node is selected.
     */
    selected: boolean;
}

export namespace ISelectableTreeNode {

    export function is(node: ITreeNode | undefined): node is ISelectableTreeNode {
        return !!node && 'selected' in node;
    }

    export function isSelected(node: ITreeNode | undefined): node is ISelectableTreeNode {
        return is(node) && node.selected;
    }

    export function isVisible(node: ITreeNode | undefined): node is ISelectableTreeNode {
        return is(node) && ITreeNode.isVisible(node);
    }

    export function getVisibleParent(node: ITreeNode | undefined): ISelectableTreeNode | undefined {
        if (node) {
            if (isVisible(node.parent)) {
                return node.parent;
            }
            return getVisibleParent(node.parent);
        }
    }
}

@injectable()
export class TreeSelectionService implements ITreeSelectionService {

    @inject(ITree)
    protected readonly tree: ITree;
    protected readonly _selectedNodes: ISelectableTreeNode[] = [];
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

    selectNode(raw: ISelectableTreeNode, options?: ITreeSelectionService.Options): void {
        const node = this.validateNode(raw);
        if (ISelectableTreeNode.is(node)) {
            this.doSelectNode(node, options);
        }
    }

    protected doSelectNode(node: ISelectableTreeNode, options?: ITreeSelectionService.Options): void {
        // Shortcut. Nothing is selected yet. Select the node and we are done.
        if (this._selectedNodes.length === 0) {
            node.selected = true;
            this._selectedNodes.unshift(node);
            this.fireSelectionChanged();
            return;
        }

        const multi = options && options.multi;
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
                // length === 1 => The node we wan to select is already selected. Nothing to do.
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

    unselectNode(raw: ISelectableTreeNode | undefined): void {
        if (raw === undefined) {
            this.doUnselectNode(undefined);
        } else {
            const node = this.tree.validateNode(raw);
            if (ISelectableTreeNode.is(node)) {
                this.doUnselectNode(node);
            }
        }
    }

    protected doUnselectNode(node: ISelectableTreeNode | undefined): void {
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

    protected validateNode(node: ITreeNode | undefined): ITreeNode | undefined {
        return this.tree.validateNode(node);
    }

    protected clearSelections() {
        this._selectedNodes.forEach(n => n.selected = false);
        this._selectedNodes.length = 0;
    }

}
