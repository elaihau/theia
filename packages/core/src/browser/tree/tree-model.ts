/*
 * Copyright (C) 2017 TypeFox and others.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 */

import { inject, injectable } from "inversify";
import { DisposableCollection, Event, Emitter, SelectionProvider } from "../../common";
import { Tree, TreeNode, CompositeTreeNode } from "./tree";
import { TreeSelectionService, SelectableTreeNode, TreeSelection } from "./tree-selection";
import { TreeExpansionService, ExpandableTreeNode } from "./tree-expansion";
import { TreeNavigationService } from "./tree-navigation";
import { TreeNodeIterator, TreeNodeIteratorImpl, BackwardTreeNodeIterator } from "./tree-iterator";
import { StructuredSelection } from "../../common/selection";

export const TreeModel = Symbol("TreeModel");

/**
 * The tree model.
 */
export interface TreeModel extends Tree, TreeSelectionService, TreeExpansionService {
    /**
     * Expand a node taking into the account node selection if a given node is undefined.
     */
    expandNode(node?: Readonly<ExpandableTreeNode>): boolean;
    /**
     * Collapse a node taking into the account node selection if a given node is undefined.
     */
    collapseNode(node?: Readonly<ExpandableTreeNode>): boolean;
    /**
     * Toggle node expansion taking into the account node selection if a given node is undefined.
     */
    toggleNodeExpansion(node?: Readonly<ExpandableTreeNode>): void;
    /**
     * Select prev node relatively to the selected taking into account node expansion.
     */
    selectPrevNode(): void;
    /**
     * Select next node relatively to the selected taking into account node expansion.
     */
    selectNextNode(): void;
    /**
     * Open a given node or a selected if the given is undefined.
     */
    openNode(node?: TreeNode | undefined): void;
    /**
     * Event for when a node should be opened.
     */
    readonly onOpenNode: Event<TreeNode>;
    /**
     * Select a parent node relatively to the selected taking into account node expansion.
     */
    selectParent(): void;
    /**
     * Navigate to the given node if it is defined.
     * Navigation sets a node as a root node and expand it.
     */
    navigateTo(node: TreeNode | undefined): void;
    /**
     * Test whether it is possible to navigate forward.
     */
    canNavigateForward(): boolean;
    /**
     * Test whether it is possible to navigate backward.
     */
    canNavigateBackward(): boolean;
    /**
     * Navigate forward.
     */
    navigateForward(): void;
    /**
     * Navigate backward.
     */
    navigateBackward(): void;
}

@injectable()
export class TreeServices {
    @inject(TreeSelectionService) readonly selection: TreeSelectionService;
    @inject(TreeExpansionService) readonly expansion: TreeExpansionService;
    @inject(TreeNavigationService) readonly navigation: TreeNavigationService;
}

@injectable()
export class TreeModelImpl implements TreeModel, SelectionProvider<TreeSelection> {

    protected readonly onChangedEmitter = new Emitter<void>();
    protected readonly onOpenNodeEmitter = new Emitter<TreeNode>();
    protected readonly toDispose = new DisposableCollection();

    protected readonly selection: TreeSelectionService;
    protected readonly expansion: TreeExpansionService;
    protected readonly navigation: TreeNavigationService;

    constructor(
        @inject(Tree) protected readonly tree: Tree,
        @inject(TreeServices) services: TreeServices
    ) {
        Object.assign(this, services);
        this.toDispose.push(tree);
        this.toDispose.push(tree.onChanged(() => this.fireChanged()));

        this.toDispose.push(this.selection);
        this.toDispose.push(this.selection.onSelectionChanged(() => this.fireChanged()));

        this.toDispose.push(this.expansion);
        this.toDispose.push(this.expansion.onExpansionChanged(node => {
            this.fireChanged();
            if (!node.expanded && [...this.selectedNodes].some(selectedNode => CompositeTreeNode.isAncestor(node, selectedNode))) {
                if (SelectableTreeNode.isVisible(node)) {
                    this.selectNode(node);
                }
            }
        }));

        this.toDispose.push(this.onChangedEmitter);
    }

    dispose() {
        this.toDispose.dispose();
    }

    get root() {
        return this.tree.root;
    }

    set root(root: TreeNode | undefined) {
        this.tree.root = root;
    }

    get onChanged(): Event<void> {
        return this.onChangedEmitter.event;
    }

    get onOpenNode(): Event<TreeNode> {
        return this.onOpenNodeEmitter.event;
    }

    protected fireChanged(): void {
        this.onChangedEmitter.fire(undefined);
    }

    get onNodeRefreshed() {
        return this.tree.onNodeRefreshed;
    }

    getNode(id: string | undefined) {
        return this.tree.getNode(id);
    }

    validateNode(node: TreeNode | undefined) {
        return this.tree.validateNode(node);
    }

    refresh(parent?: Readonly<CompositeTreeNode>): void {
        if (parent) {
            this.tree.refresh(parent);
        } else {
            this.tree.refresh();
        }
    }

    get selectedNodes() {
        return this.selection.selectedNodes;
    }

    get onSelectionChanged() {
        return this.selection.onSelectionChanged;
    }

    selectNode(node: SelectableTreeNode, props?: TreeSelectionService.SelectionProps): void {
        this.selection.selectNode(node, props);
    }

    unselectNode(node: SelectableTreeNode | undefined): void {
        this.selection.unselectNode(node);
    }

    get onExpansionChanged() {
        return this.expansion.onExpansionChanged;
    }

    expandNode(raw?: Readonly<ExpandableTreeNode>): boolean {
        for (const node of raw ? [raw] : this.selectedNodes) {
            if (ExpandableTreeNode.is(node)) {
                return this.expansion.expandNode(node);
            }
        }
        return false;
    }

    collapseNode(raw?: Readonly<ExpandableTreeNode>): boolean {
        for (const node of raw ? [raw] : this.selectedNodes) {
            if (ExpandableTreeNode.is(node)) {
                return this.expansion.collapseNode(node);
            }
        }
        return false;
    }

    toggleNodeExpansion(raw?: Readonly<ExpandableTreeNode>): void {
        for (const node of raw ? [raw] : this.selectedNodes) {
            if (ExpandableTreeNode.is(node)) {
                return this.expansion.toggleNodeExpansion(node);
            }
        }
    }

    selectPrevNode(): void {
        const node = this.selectedNodes[0];
        const iterator = this.createBackwardIterator(node);
        this.selectNextVisibleNode(iterator);
    }

    selectNextNode(): void {
        const node = this.selectedNodes[0];
        const iterator = this.createIterator(node);
        this.selectNextVisibleNode(iterator);
    }

    protected selectNextVisibleNode(iterator: TreeNodeIterator): void {
        let result = iterator.next();
        while (!result.done && !SelectableTreeNode.isVisible(result.value)) {
            result = iterator.next();
        }
        const node = result.value;
        if (SelectableTreeNode.isVisible(node)) {
            this.selectNode(node);
        }
    }

    protected createBackwardIterator(node: TreeNode | undefined): TreeNodeIterator {
        return new BackwardTreeNodeIterator(node, {
            pruneCollapsed: true
        });
    }

    protected createIterator(node: TreeNode | undefined): TreeNodeIterator {
        return new TreeNodeIteratorImpl(node, {
            pruneCollapsed: true
        });
    }

    openNode(raw?: TreeNode | undefined): void {
        const node = raw || StructuredSelection.firstItem(this.selectedNodes);
        if (node) {
            this.doOpenNode(node);
            this.onOpenNodeEmitter.fire(node);
        }
    }

    protected doOpenNode(node: TreeNode): void {
        if (ExpandableTreeNode.is(node)) {
            this.toggleNodeExpansion(node);
        }
    }

    selectParent(): void {
        if (StructuredSelection.isSingle(this.selectedNodes)) {
            const node = StructuredSelection.firstItem(this.selectedNodes);
            const parent = SelectableTreeNode.getVisibleParent(node);
            if (parent) {
                this.selectNode(parent);
            }
        }
    }

    navigateTo(node: TreeNode | undefined): void {
        if (node) {
            this.navigation.push(node);
            this.doNavigate(node);
        }
    }

    canNavigateForward(): boolean {
        return !!this.navigation.next;
    }

    canNavigateBackward(): boolean {
        return !!this.navigation.prev;
    }

    navigateForward(): void {
        const node = this.navigation.advance();
        if (node) {
            this.doNavigate(node);
        }
    }

    navigateBackward(): void {
        const node = this.navigation.retreat();
        if (node) {
            this.doNavigate(node);
        }
    }

    protected doNavigate(node: TreeNode): void {
        this.tree.root = node;
        if (ExpandableTreeNode.is(node)) {
            this.expandNode(node);
        }
        if (SelectableTreeNode.is(node)) {
            this.selectNode(node);
        }
    }

}
